from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Application, Employer, Job, Notification, User
from test_admin_dashboard import dashboard_accounts


def test_approval_notifies_once_and_blocks_inactive_accounts(client, engine, dashboard_accounts):
    headers = dashboard_accounts['admin']
    with Session(engine) as db:
        company = db.scalar(select(Employer).where(Employer.name == 'Pending Company'))
        company_id, account_id = company.id, company.user_id
    path = f'/api/admin/companies/{company_id}'
    for _ in range(2):
        assert client.patch(path, headers=headers, json={'approved': True}).status_code == 200
    with Session(engine) as db:
        notifications = db.scalars(select(Notification).where(Notification.user_id == account_id)).all()
        assert len(notifications) == 1
        assert 'approved' in notifications[0].message
    assert client.patch(path, headers=headers, json={'approved': False}).status_code == 200
    with Session(engine) as db, db.begin():
        db.get(User, account_id).is_active = False
    assert client.patch(path, headers=headers, json={'approved': True}).status_code == 409
    with Session(engine) as db:
        assert db.get(Employer, company_id).approved is False


def test_pending_jobs_are_private_and_applicants_without_profiles_remain_visible(client, engine, dashboard_accounts):
    with Session(engine) as db, db.begin():
        company = db.scalar(select(Employer).where(Employer.name == 'Pending Company'))
        student = db.scalar(select(User).where(User.email == 'inactive@dashboard.example'))
        job = Job(employer_id=company.id, title='Pending employer vacancy', description='Not public',
                  location='Remote', job_type='Internship')
        db.add(job)
        db.flush()
        job_id = job.id
        db.add(Application(user_id=student.id, job_id=job_id))
    assert client.get(f'/api/jobs/{job_id}').status_code == 404
    assert client.get(f'/api/jobs/{job_id}', headers=dashboard_accounts['student']).status_code == 404
    for role in ['employer', 'admin']:
        result = client.get(f'/api/jobs/{job_id}', headers=dashboard_accounts[role])
        assert result.status_code == 200
        assert result.headers['cache-control'] == 'no-store'
    applications = client.get('/api/employer/applications', headers=dashboard_accounts['employer']).json()
    assert applications['total'] == 1
    assert applications['items'][0]['applicant']['email'] == 'inactive@dashboard.example'
    assert applications['items'][0]['applicant']['name'] == ''
    for query in ['inactive@dashboard.example', 'Pending employer vacancy']:
        found = client.get('/api/employer/applications', params={'q': query}, headers=dashboard_accounts['employer'])
        assert found.json()['total'] == 1
    assert client.get('/api/employer/applications?status=invalid', headers=dashboard_accounts['employer']).status_code == 422


def test_skill_names_are_unique_ignoring_case_and_spaces(client, dashboard_accounts):
    headers = dashboard_accounts['admin']
    assert client.post('/api/admin/skills', headers=headers, json={'name': ' python '}).status_code == 409
    assert client.post('/api/admin/skills', headers=headers, json={'name': 'Project Regression Skill'}).status_code == 201
    assert client.post('/api/admin/skills', headers=headers, json={'name': 'PROJECT REGRESSION SKILL'}).status_code == 409


def test_notification_counts_filtering_and_bulk_read_are_account_scoped(client, engine, dashboard_accounts):
    with Session(engine) as db, db.begin():
        student = db.scalar(select(User).where(User.email == 'student@dashboard.example'))
        employer = db.scalar(select(User).where(User.email == 'employer@dashboard.example'))
        db.add_all([Notification(user_id=student.id, message='Student update') for _ in range(21)])
        db.add(Notification(user_id=employer.id, message='Private employer update'))
    headers = dashboard_accounts['student']
    assert client.get('/api/notifications/unread-count', headers=headers).json() == {'count': 21}
    first = client.get('/api/notifications?page_size=20&unread_only=true', headers=headers)
    assert len(first.json()) == 20
    assert first.headers['cache-control'] == 'no-store'
    assert len(client.get('/api/notifications?page_size=20&page=2', headers=headers).json()) == 1
    assert client.post('/api/notifications/read-all', headers=headers).status_code == 204
    assert client.get('/api/notifications?unread_only=true', headers=headers).json() == []
    assert client.get('/api/notifications/unread-count', headers=headers).json() == {'count': 0}
    assert client.get('/api/notifications/unread-count', headers=dashboard_accounts['employer']).json() == {'count': 1}
    assert client.get('/api/notifications?page=0', headers=headers).status_code == 422
    assert client.get('/api/notifications/unread-count').status_code == 401
    assert client.post('/api/notifications/read-all').status_code == 401
