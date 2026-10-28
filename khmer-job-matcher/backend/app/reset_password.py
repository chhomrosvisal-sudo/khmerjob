"""Local account recovery for an operator with access to the configured database.

Passwords are prompted privately, never accepted as command-line arguments.
"""
import argparse
from getpass import getpass

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_engine
from app.models import PasswordReset, User
from app.schemas.auth import Credentials


def reset_account_password(db: Session, credentials: Credentials):
    user = db.scalar(select(User).where(User.email == str(credentials.email)).with_for_update())
    if user is None:
        raise ValueError('Account not found; no changes made.')
    user.password_hash = hash_password(credentials.password.get_secret_value())
    user.token_version += 1
    # Previously issued recovery codes/tokens must not change the new password.
    db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id).values(used=True))


def main():
    parser = argparse.ArgumentParser(description='Reset one existing account password locally; preserve its role and data.')
    parser.add_argument('--email', required=True)
    args = parser.parse_args()
    password = getpass('New password (12-128 characters): ')
    if password != getpass('Confirm new password: '):
        parser.error('Passwords do not match; no changes made.')
    try:
        credentials = Credentials(email=args.email, password=password)
    except ValueError:
        parser.error('Provide a valid email and a password with 12-128 characters; no changes made.')
    try:
        with Session(get_engine()) as db, db.begin():
            reset_account_password(db, credentials)
    except ValueError as error:
        parser.error(str(error))
    print('Password updated. Previous sessions and recovery codes were revoked. Account role and data were preserved.')


if __name__ == '__main__':
    main()
