import hashlib
import hmac
import logging
import secrets
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Request, Response, BackgroundTasks
from pydantic import EmailStr, Field, SecretStr
from sqlalchemy import select, update
from app.core.dependencies import Database
from app.core.security import hash_password
from app.core.rate_limit import utcnow, digest, throttle
from app.models import PasswordReset, User
from app.schemas.auth import StrictInput
from app.services import mailer

router = APIRouter(prefix='/api/auth', tags=['password recovery'])
logger = logging.getLogger(__name__)


def deliver_recovery(email, code):
    try:
        mailer.send_recovery(email, code)
    except Exception:
        logger.warning('Password recovery delivery failed; check SMTP configuration.')


class RecoveryRequest(StrictInput):
    email: EmailStr = Field(max_length=254)


class VerifyRequest(StrictInput):
    request_id: str = Field(min_length=20, max_length=64)
    code: str = Field(pattern=r'^\d{6}$')


class ResetRequest(StrictInput):
    request_id: str = Field(min_length=20, max_length=64)
    token: SecretStr = Field(min_length=20, max_length=100)
    password: SecretStr = Field(min_length=12, max_length=128)


@router.get('/recovery-capabilities')
def capabilities():
    return {'enabled': mailer.configured(), 'code_expiry_seconds': 600, 'resend_seconds': 60}


@router.post('/password/request')
def request_recovery(payload: RecoveryRequest, request: Request, db: Database, response: Response, background_tasks: BackgroundTasks):
    if not mailer.configured():
        raise HTTPException(503, 'Password recovery email is not configured. Contact the site operator.')
    email = str(payload.email).lower()
    ip = request.client.host if request.client else 'unknown'
    throttle(db, 'recovery-ip', ip, 30, 900)
    identity = ip + ':' + email
    throttle(db, 'recovery', identity, 3, 900)
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    request_id = secrets.token_urlsafe(30)
    if user is not None:
        code = f'{secrets.randbelow(1000000):06d}'
        db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id).values(used=True))
        db.add(PasswordReset(id=request_id, user_id=user.id, code_hash=digest(request_id + ':' + code),
                            expires_at=utcnow() + timedelta(minutes=10), attempts=0, used=False))
        db.commit()
        background_tasks.add_task(deliver_recovery, email, code)
    response.headers['Cache-Control'] = 'no-store'
    return {'request_id': request_id, 'message': 'If an active account exists, recovery instructions have been requested.', 'resend_seconds': 60}


@router.post('/password/verify')
def verify(payload: VerifyRequest, request: Request, db: Database, response: Response):
    throttle(db, 'recovery-verification-ip', request.client.host if request.client else 'unknown', 30, 600)
    throttle(db, 'recovery-verification', (request.client.host if request.client else 'unknown') + ':' + payload.request_id, 6, 600)
    row = db.scalar(select(PasswordReset).where(PasswordReset.id == payload.request_id).with_for_update())
    if row is None or row.used or row.expires_at <= utcnow() or row.attempts >= 5 or row.token_hash:
        raise HTTPException(400, 'Invalid or expired recovery request. Request a new code.')
    if not hmac.compare_digest(row.code_hash, digest(payload.request_id + ':' + payload.code)):
        row.attempts += 1
        db.commit()
        raise HTTPException(400, 'Invalid or expired recovery code')
    token = secrets.token_urlsafe(32)
    row.token_hash = hashlib.sha256(token.encode()).hexdigest()
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return {'reset_token': token}


@router.post('/password/reset', status_code=204)
def reset(payload: ResetRequest, db: Database):
    row = db.scalar(select(PasswordReset).where(PasswordReset.id == payload.request_id).with_for_update())
    candidate = hashlib.sha256(payload.token.get_secret_value().encode()).hexdigest()
    if row is None or row.used or row.expires_at <= utcnow() or not row.token_hash or not hmac.compare_digest(row.token_hash, candidate):
        raise HTTPException(400, 'Invalid or expired password reset token')
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise HTTPException(400, 'Invalid or expired password reset token')
    user.password_hash = hash_password(payload.password.get_secret_value())
    user.token_version += 1
    db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id).values(used=True))
    db.commit()
    return Response(status_code=204, headers={'Cache-Control': 'no-store'})
