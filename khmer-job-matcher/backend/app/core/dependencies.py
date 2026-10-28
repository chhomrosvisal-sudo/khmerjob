from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token, unauthorized
from app.db.session import get_db
from app.models import User

Database = Annotated[Session, Depends(get_db)]
bearer = HTTPBearer(auto_error=False)


def get_current_user(db: Database,
                     credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> User:
    if credentials is None:
        raise unauthorized()
    claims = decode_token(credentials.credentials)
    user = db.get(User, int(claims['sub']))
    if user is None or not user.is_active or user.token_version != claims['ver']:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(role: str):
    def check(user: CurrentUser) -> User:
        # Read the current database role, never trust a role supplied in a JWT.
        if user.role != role:
            raise HTTPException(403, 'This action is not available for your role')
        return user
    return check


StudentUser = Annotated[User, Depends(require_role('student'))]
EmployerUser = Annotated[User, Depends(require_role('employer'))]
AdminUser = Annotated[User, Depends(require_role('admin'))]


def optional_user(db: Database,
                  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    return get_current_user(db, credentials) if credentials else None


OptionalUser = Annotated[User | None, Depends(optional_user)]
