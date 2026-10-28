"""Local operator command for privileged accounts; public signup is student-only."""
import argparse
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_engine
from app.models import Employer, User
from app.schemas.auth import Credentials


def main():
    parser = argparse.ArgumentParser(description='Create a new employer or admin account; never modifies existing users.')
    parser.add_argument('--role', required=True, choices=['employer', 'admin'])
    parser.add_argument('--email', required=True)
    parser.add_argument('--company', help='Required for employers (1–160 characters)')
    args = parser.parse_args()
    company = (args.company or '').strip()
    if args.role == 'employer' and not 1 <= len(company) <= 160:
        parser.error('Employers require --company with 1–160 characters')
    password = getpass('Password (12–128 characters): ')
    if password != getpass('Confirm password: '):
        parser.error('Passwords do not match')
    try:
        credentials = Credentials(email=args.email, password=password)
    except ValueError:
        # Do not echo validation details containing the operator's password.
        parser.error('Provide a valid email and a password with 12–128 characters')
    with Session(get_engine()) as db, db.begin():
        if db.scalar(select(User.id).where(User.email == str(credentials.email))):
            parser.error('Email already exists; no changes made')
        user = User(email=str(credentials.email), role=args.role, password_hash=hash_password(password))
        db.add(user)
        db.flush()
        if args.role == 'employer':
            db.add(Employer(user_id=user.id, name=company, is_demo=False))
    print(f'Created {args.role} account. No existing users were modified.')


if __name__ == '__main__':
    main()
