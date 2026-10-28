"""Configure isolated tests before importing the application."""
import os

os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['FRONTEND_ORIGIN'] = 'http://localhost:5173'
os.environ['JWT_SECRET'] = 'test-only-secret-not-for-deployment-1234567890'
os.environ['RATE_LIMIT_ENABLED'] = 'false'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.session import Base, get_db
from app.main import create_app
from app.models import Job
from app.seed import seed


@pytest.fixture(autouse=True)
def isolated_ml_artifacts(tmp_path, monkeypatch):
    monkeypatch.setenv('ML_MODEL_DIR', str(tmp_path / 'models'))
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def engine():
    get_settings.cache_clear()
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)

    @event.listens_for(engine, 'connect')
    def foreign_keys(connection, record):
        connection.execute('PRAGMA foreign_keys=ON')

    Base.metadata.create_all(engine)
    with Session(engine) as session, session.begin():
        seed(session)
        seed(session)
        assert session.scalar(select(func.count()).select_from(Job)) == 4
    yield engine
    engine.dispose()
    get_settings.cache_clear()


@pytest.fixture
def client(engine):
    application = create_app()

    def db():
        with Session(engine) as session:
            yield session

    application.dependency_overrides[get_db] = db
    with TestClient(application) as test_client:
        yield test_client
