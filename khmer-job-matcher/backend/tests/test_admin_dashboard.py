from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import issue_token
from app.models import Application, Employer, Job, StudentProfile, User


@pytest.fixture
def dashboard_accounts(engine):
    with Session(engine) as db, db.begin():
        accounts = {
            role: User(email=f'{role}@dashboard.example', role=role, password_hash='unused-in-this-test')
            for role in ['admin', 'student', 'employer']
        }
        inactive = User(email='inactive@dashboard.example', role='student',
                        password_hash='unused-in-this-test', is_active=False)
        db.add_all([*accounts.values(), inactive])
        db.flush()
        db.add(StudentProfile(user_id=accounts['student'].id, name='Dara 100%'))
        db.add(Employer(user_id=accounts['employer'].id, name='Pending Company', approved=False))
        jobs = db.scalars(select(Job).order_by(Job.id)).all()
        jobs[0].is_active = False
        db.add_all([
            Application(user_id=accounts['student'].id, job_id=jobs[0].id,
                        status='reviewing', created_at=datetime(2026, 1, 1)),
            Application(user_id=accounts['student'].id, job_id=jobs[1].id,
                        status='accepted', created_at=datetime(2026, 1, 2)),
            Application(user_id=inactive.id, job_id=jobs[2].id,
                        status='submitted', created_at=datetime(2026, 1, 3)),
        ])
        headers = {role: {'Authorization': 'Bearer ' + issue_token(account)[0]}
                   for role, account in accounts.items()}
        headers['inactive'] = {'Authorization': 'Bearer ' + issue_token(inactive)[0]}
        return headers


def test_admin_overview_uses_database_counts_and_is_not_cached(client, dashboard_accounts):
    result = client.get('/api/admin/overview', headers=dashboard_accounts['admin'])
    assert result.status_code == 200
    assert result.headers['cache-control'] == 'no-store'
    assert result.json() == {
        'users': 4, 'students': 2, 'employers': 5, 'jobs': 4, 'open_jobs': 3,
        'applications': 3, 'skills': 9, 'pending_employers': 1,
        'statuses': {'reviewing': 1, 'accepted': 1, 'submitted': 1},
    }


def test_admin_applications_are_searchable_paginated_and_read_only(client, dashboard_accounts):
    headers = dashboard_accounts['admin']
    result = client.get('/api/admin/applications?page_size=1', headers=headers)
    assert result.status_code == 200
    assert result.headers['cache-control'] == 'no-store'
    first = result.json()
    assert first['total'] == 3 and first['page'] == 1 and first['page_size'] == 1
    assert first['items'][0]['applicant_name'] == ''  # Missing profiles do not hide applications.
    assert first['items'][0]['applicant_email'] == 'inactive@dashboard.example'
    second = client.get('/api/admin/applications?page_size=1&page=2', headers=headers).json()
    assert first['items'][0]['id'] != second['items'][0]['id']
    assert second['items'][0]['status'] == 'accepted'
    for query in ['Dara', '%', 'student@dashboard.example']:
        filtered = client.get('/api/admin/applications', params={'q': query}, headers=headers).json()
        assert filtered['total'] == 2
    reviewed = client.get('/api/admin/applications?status=reviewing', headers=headers).json()
    assert reviewed['total'] == 1
    item = reviewed['items'][0]
    assert item['is_demo'] is True
    assert {'password_hash', 'content', 'resume_id'}.isdisjoint(item)
    by_job = client.get('/api/admin/applications', params={'q': item['job_title']}, headers=headers).json()
    assert by_job['total'] == 1
    assert client.get('/api/admin/applications?q=absent', headers=headers).json()['items'] == []
    assert client.get('/api/admin/applications?page=20', headers=headers).json()['items'] == []
    assert client.patch(f"/api/admin/applications/{item['id']}", headers=headers,
                        json={'status': 'accepted'}).status_code in [404, 405]


@pytest.mark.parametrize('path', ['/api/admin/overview', '/api/admin/applications'])
def test_admin_dashboard_endpoints_enforce_current_role(client, dashboard_accounts, path):
    assert client.get(path).status_code == 401
    for role in ['student', 'employer']:
        assert client.get(path, headers=dashboard_accounts[role]).status_code == 403
    assert client.get(path, headers=dashboard_accounts['inactive']).status_code == 401


@pytest.mark.parametrize('params', [
    {'page': 0}, {'page_size': 101}, {'status': 'invented'}, {'q': 'x' * 161},
])
def test_admin_application_filters_are_validated(client, dashboard_accounts, params):
    assert client.get('/api/admin/applications', params=params,
                      headers=dashboard_accounts['admin']).status_code == 422
