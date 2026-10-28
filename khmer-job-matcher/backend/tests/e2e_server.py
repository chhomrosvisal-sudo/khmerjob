"""Launch an isolated browser-test backend, never the user's MySQL database."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if os.environ.get('APP_E2E') != '1':
    raise SystemExit('This helper is only started by the Playwright configuration.')
url = os.environ.get('DATABASE_URL', '')
if not url.startswith('sqlite:///') or not url.endswith('/e2e.db') or '.local-run' not in url:
    raise SystemExit('Browser tests require their isolated .local-run SQLite database.')

from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session
from app.db.session import get_engine
from app.models import User
from app.core.security import hash_password
from app.seed import seed
import uvicorn

command.upgrade(Config('alembic.ini'), 'head')
with Session(get_engine()) as db, db.begin():
    seed(db)
    db.add(User(email=os.environ['E2E_ADMIN_EMAIL'], role='admin', password_hash=hash_password(os.environ['E2E_ADMIN_PASSWORD'])))
uvicorn.run('app.main:app', host='127.0.0.1', port=8011)
