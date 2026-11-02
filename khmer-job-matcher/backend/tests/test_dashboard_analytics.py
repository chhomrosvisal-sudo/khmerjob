from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Job
from test_admin_dashboard import dashboard_accounts


def test_dashboard_range_aggregates_and_export(client, engine, dashboard_accounts):
    with Session(engine) as db, db.begin():
        job = db.query(Job).first()
        job.created_at = datetime(2026, 1, 31, 23, 59, 59)
    headers = dashboard_accounts['admin']
    params = {'start': '2026-01-01', 'end': '2026-01-31'}
    result = client.get('/api/admin/dashboard', params=params, headers=headers)
    assert result.status_code == 200
    assert result.headers['cache-control'] == 'no-store'
    data = result.json()
    assert data['applications'] == 3
    assert sum(row['count'] for row in data['application_statuses']) == 3
    assert data['job_postings'] == [{'month': '2026-01', 'count': 1}]
    assert data['ai_matches'] is None and data['pending_jobs'] is None
    assert data['active_jobs'] == 0  # The dated job is closed.
    assert data['top_skills'] == []
    assert all('email' not in row for row in data['activities'])
    export = client.get('/api/admin/dashboard/export', params=params, headers=headers)
    assert export.status_code == 200
    assert 'applications,3' in export.text
    assert 'Unavailable' in export.text
    empty = client.get('/api/admin/dashboard?start=2000-01-01&end=2000-02-01', headers=headers).json()
    assert empty['applications'] == 0 and empty['activities'] == []
    assert empty['job_postings'] == [{'month': '2000-01', 'count': 0}, {'month': '2000-02', 'count': 0}]


def test_dashboard_authorization_and_validation(client, dashboard_accounts):
    for path in ['/api/admin/dashboard', '/api/admin/dashboard/export']:
        assert client.get(path).status_code == 401
        for role in ['student', 'employer']:
            assert client.get(path, headers=dashboard_accounts[role]).status_code == 403
        for query in ['start=2026-02-01&end=2026-01-01', 'start=invalid', 'start=2000-01-01&end=2026-01-01']:
            assert client.get(path + '?' + query, headers=dashboard_accounts['admin']).status_code == 422
