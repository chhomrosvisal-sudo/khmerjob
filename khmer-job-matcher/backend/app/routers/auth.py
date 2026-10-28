from fastapi import APIRouter, HTTPException, Response, Request
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import CurrentUser, Database
from app.core.security import dummy_hash, hash_password, issue_token, unauthorized, verify_password
from app.models import StudentProfile, User, Employer
from pydantic import Field, field_validator
from app.schemas.auth import Credentials, Registration, TokenOut, UserOut
from app.core.rate_limit import throttle

router = APIRouter(prefix='/api/auth', tags=['authentication'])


class EmployerRegistration(Credentials):
    company: str = Field(min_length=1, max_length=160)

    @field_validator('company')
    @classmethod
    def company_not_blank(cls, value):
        if not value.strip():
            raise ValueError('Company cannot be blank')
        return value.strip()


@router.post('/employer-register', response_model=UserOut, status_code=201)
def register_employer(payload: EmployerRegistration, request: Request, db: Database):
    throttle(db, 'register-employer', request.client.host if request.client else 'unknown', 5, 900)
    user = User(email=str(payload.email), password_hash=hash_password(payload.password.get_secret_value()), role='employer')
    try:
        db.add(user)
        db.flush()
        db.add(Employer(user_id=user.id, name=payload.company, is_demo=False, approved=False))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Email is already registered') from None
    db.refresh(user)
    return user


@router.post('/register', response_model=UserOut, status_code=201)
def register(payload: Registration, request: Request, db: Database):
    throttle(db, 'register', request.client.host if request.client else 'unknown', 5, 900)
    user = User(email=str(payload.email), password_hash=hash_password(payload.password.get_secret_value()), role='student')
    try:
        db.add(user)
        db.flush()
        db.add(StudentProfile(user_id=user.id, name=payload.name))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Email is already registered') from None
    db.refresh(user)
    return user


@router.post('/login', response_model=TokenOut)
def login(payload: Credentials, response: Response, request: Request, db: Database):
    throttle(db, 'login-ip', request.client.host if request.client else 'unknown', 100, 300)
    throttle(db, 'login', (request.client.host if request.client else 'unknown') + ':' + str(payload.email), 10, 300)
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    valid = verify_password(payload.password.get_secret_value(), user.password_hash if user else dummy_hash())
    if not valid or user is None or not user.is_active:
        raise unauthorized()
    token, lifetime = issue_token(user)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Pragma'] = 'no-cache'
    return TokenOut(access_token=token, expires_in=lifetime)


@router.get('/me', response_model=UserOut)
def me(user: CurrentUser, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return user


@router.post('/logout', status_code=204)
def logout(user: CurrentUser, db: Database):
    # An atomic increment invalidates all previously issued sessions for this user.
    db.execute(update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    db.commit()
    return Response(status_code=204, headers={'Cache-Control': 'no-store'})
