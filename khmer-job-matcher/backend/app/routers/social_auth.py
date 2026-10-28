import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update, func
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import CurrentUser, Database
from app.core.rate_limit import throttle
from app.core.security import hash_password, issue_token
from app.models import OAuthFlow, SocialIdentity, StudentProfile, User
from app.schemas.auth import TokenOut
from app.services.social_auth import authorization_url, exchange_identity, provider_config

router = APIRouter(prefix='/api/auth/social', tags=['social authentication'])
Provider = Literal['google', 'facebook']


class StartBody(BaseModel):
    verifier: str = Field(min_length=43, max_length=128, pattern=r'^[A-Za-z0-9_\-]+$')


class CompleteBody(StartBody):
    state: str = Field(min_length=43, max_length=128, pattern=r'^[A-Za-z0-9_\-]+$')
    code: str = Field(min_length=1, max_length=4096)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


@router.get('/providers')
def providers(response: Response):
    available = {}
    for provider in ['google', 'facebook']:
        try:
            provider_config(provider)
            available[provider] = {'enabled': True}
        except HTTPException:
            available[provider] = {'enabled': False}
    response.headers['Cache-Control'] = 'no-store'
    return available


def start_flow(provider, payload, request, db, response, user=None):
    provider_config(provider)
    throttle(db, 'social-start', request.client.host if request.client else 'unknown', 20, 300)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.execute(delete(OAuthFlow).where(OAuthFlow.expires_at < now))
    state = secrets.token_urlsafe(32)
    db.add(OAuthFlow(id=digest(state), provider=provider, browser_hash=digest(payload.verifier),
                     expires_at=now + timedelta(minutes=5), link_user_id=user.id if user else None,
                     link_token_version=user.token_version if user else None))
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return {'state': state, 'authorization_url': authorization_url(provider, state, payload.verifier)}


@router.post('/{provider}/start')
def start(provider: Provider, payload: StartBody, request: Request, db: Database, response: Response):
    return start_flow(provider, payload, request, db, response)


@router.post('/{provider}/link')
def link(provider: Provider, payload: StartBody, request: Request, db: Database, response: Response, user: CurrentUser):
    if db.scalar(select(SocialIdentity.id).where(SocialIdentity.user_id == user.id, SocialIdentity.provider == provider)):
        raise HTTPException(409, 'This provider is already connected to your account.')
    return start_flow(provider, payload, request, db, response, user)


@router.post('/{provider}/complete', response_model=TokenOut)
def complete(provider: Provider, payload: CompleteBody, request: Request, db: Database, response: Response):
    provider_config(provider)
    throttle(db, 'social-complete', request.client.host if request.client else 'unknown', 30, 300)
    flow_id = digest(payload.state)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Atomic claim prevents concurrent callback replay. The browser must prove its independent secret.
    claimed = db.execute(update(OAuthFlow).where(OAuthFlow.id == flow_id, OAuthFlow.provider == provider,
        OAuthFlow.browser_hash == digest(payload.verifier), OAuthFlow.used.is_(False),
        OAuthFlow.expires_at > now).values(used=True))
    if claimed.rowcount != 1:
        db.rollback()
        raise HTTPException(400, 'This sign-in request expired, was already used, or belongs to another browser. Start again.')
    db.commit()
    flow = db.get(OAuthFlow, flow_id)
    identity = exchange_identity(provider, payload.code, payload.verifier)
    linked = db.scalar(select(SocialIdentity).where(SocialIdentity.provider == provider,
                                                   SocialIdentity.subject == identity['subject']))
    if flow.link_user_id:
        user = db.get(User, flow.link_user_id)
        if not user or not user.is_active or user.token_version != flow.link_token_version:
            raise HTTPException(401, 'Your account session ended. Sign in again before connecting a provider.')
        if linked and linked.user_id != user.id:
            raise HTTPException(409, 'This provider account is already connected to another account.')
    elif linked:
        user = db.get(User, linked.user_id)
        if not user or not user.is_active:
            raise HTTPException(401, 'This account is unavailable. Contact the administrator.')
    else:
        # Never merge based only on email, including provider-reported verified email.
        if db.scalar(select(User.id).where(func.lower(User.email) == identity['email'].lower())):
            raise HTTPException(409, 'An account already uses this email. Sign in with your existing method, then connect this provider in Settings.')
        user = User(email=identity['email'], password_hash=hash_password(secrets.token_urlsafe(48)), role='student')
        db.add(user)
    try:
        db.flush()
        if not linked:
            db.add(SocialIdentity(user_id=user.id, provider=provider, subject=identity['subject']))
        if not flow.link_user_id and not linked:
            db.add(StudentProfile(user_id=user.id, name=identity['name']))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Account connection changed during sign-in. Start again or sign in with your existing method.') from None
    token, lifetime = issue_token(user)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Pragma'] = 'no-cache'
    return TokenOut(access_token=token, expires_in=lifetime)


@router.get('/connections')
def connections(user: CurrentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return {'providers': list(db.scalars(select(SocialIdentity.provider).where(SocialIdentity.user_id == user.id)))}
