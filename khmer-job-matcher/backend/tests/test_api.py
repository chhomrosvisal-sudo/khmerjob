"""Isolated SQLite smoke tests; never connect to a developer's configured database."""
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Job
from app.db.session import Base
from app.seed import seed


def test_health_and_docs(client):
    assert client.get('/api/health').json() == {'status': 'ok', 'database_checked': False}
    assert client.get('/docs').status_code == 200
    assert client.get('/').status_code == 200


def test_catalog_pagination_details_and_skills(client):
    first = client.get('/api/jobs?page_size=2').json()
    second = client.get('/api/jobs?page_size=2&page=2').json()
    assert first['total'] == 4
    assert len(first['items']) == 2
    assert {j['id'] for j in first['items']}.isdisjoint(j['id'] for j in second['items'])
    job = first['items'][0]
    assert job['is_demo'] and job['employer']['is_demo']
    assert job['requirements'][0]['required'] is True
    assert client.get(f"/api/jobs/{job['id']}").json() == job
    assert len(client.get('/api/skills').json()) == 9
    assert 'password_hash' not in str(first)


def test_search_filters_empty_and_validation(client):
    assert client.get('/api/jobs?q=Lotus&location=Siem%20Reap&job_type=Internship').json()['total'] == 1
    assert client.get('/api/jobs?q=React').json()['total'] == 1
    assert client.get('/api/jobs?q=absent').json()['items'] == []
    assert client.get('/api/jobs?q=%25').json()['total'] == 0
    for query in ('page=0', 'page_size=101', 'page=hello'):
        response = client.get('/api/jobs?' + query)
        assert response.status_code == 422
        assert response.json()['error']['code'] == 'validation_error'
    response = client.get('/api/jobs/9999')
    assert response.status_code == 404
    assert response.json()['error']['message'] == 'Job not found'


def test_cors(client):
    allowed = client.get('/api/health', headers={'Origin': 'http://localhost:5173'})
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'
    rejected = client.get('/api/health', headers={'Origin': 'https://untrusted.example'})
    assert 'access-control-allow-origin' not in rejected.headers


def test_migration_and_seed(tmp_path, monkeypatch):
    url = 'sqlite:///' + (tmp_path / 'migration.db').as_posix()
    monkeypatch.setenv('DATABASE_URL', url)
    get_settings.cache_clear()
    try:
        config = Config('alembic.ini')
        command.upgrade(config, 'head')
        engine = create_engine(url)
        assert set(inspect(engine).get_table_names()) == set(Base.metadata.tables) | {'alembic_version'}
        with Session(engine) as session, session.begin():
            seed(session)
            seed(session)
            assert session.scalar(select(func.count()).select_from(Job)) == 4
        engine.dispose()
        command.downgrade(config, 'base')  # Only this disposable test database.
    finally:
        get_settings.cache_clear()
