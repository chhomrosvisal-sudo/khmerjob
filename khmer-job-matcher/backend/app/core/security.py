from datetime import datetime, timedelta, timezone
from functools import lru_cache
from uuid import uuid4

import jwt
from fastapi import HTTPException
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.models import User

password_hasher = PasswordHash.recommended()
ISSUER = 'khmer-job-matcher'
AUDIENCE = 'khmer-job-matcher-api'


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


@lru_cache
def dummy_hash() -> str:
    # Run a password verification even when the email is not registered.
    return hash_password(uuid4().hex)


def verify_password(password: str, hashed: str) -> bool:
    return password_hasher.verify(password, hashed)


def issue_token(user: User) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    lifetime = settings.access_token_minutes * 60
    claims = {'sub': str(user.id), 'ver': user.token_version, 'jti': uuid4().hex,
              'iat': now, 'exp': now + timedelta(seconds=lifetime),
              'iss': ISSUER, 'aud': AUDIENCE}
    token = jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm='HS256')
    return token, lifetime


def unauthorized() -> HTTPException:
    return HTTPException(401, 'Invalid or expired credentials', headers={'WWW-Authenticate': 'Bearer'})


def decode_token(token: str) -> dict:
    try:
        claims = jwt.decode(token, get_settings().jwt_secret.get_secret_value(), algorithms=['HS256'],
                            issuer=ISSUER, audience=AUDIENCE,
                            options={'require': ['sub', 'ver', 'jti', 'iat', 'exp', 'iss', 'aud']})
        if not claims['sub'].isdigit() or int(claims['sub']) < 1 or type(claims['ver']) is not int:
            raise unauthorized()
        return claims
    except (jwt.InvalidTokenError, AttributeError, TypeError, ValueError):
        raise unauthorized() from None
