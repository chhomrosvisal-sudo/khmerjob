import pytest
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.security import issue_token
from app.models import AdminActivity, Employer, Job, JobSkill, StudentProfile, StudentSkill, User


@pytest.fixture
def accounts(engine):
    with Session(engine) as db, db.begin():
        admin = User(email='audit-admin@example.com', role='admin', password_hash='unused')
        student = User(email='audit-student@example.com', role='student', password_hash='unused')
        inactive = User(email='audit-inactive@example.com', role='student', password_hash='unused', is_active=False)
        db.add_all([admin, student, inactive])
        db.flush()
        profile = StudentProfile(user_id=student.id, name='Test')
        db.add(profile)
        db.flush()
        job = db.scalar(select(Job).order_by(Job.id))
        requirement = db.scalar(select(JobSkill).where(JobSkill.job_id == job.id, JobSkill.required.is_(True)))
        db.add(StudentSkill(student_id=profile.id, skill_id=requirement.skill_id))
        job.is_demo = False
        return {'admin': {'Authorization': 'Bearer ' + issue_token(admin)[0]},
                'student': {'Authorization': 'Bearer ' + issue_token(student)[0]},
                'student_id': student.id, 'job_id': job.id, 'skill_id': requirement.skill_id,
                'company_id': job.employer_id}


def test_gap_aggregates_exclude_demo_closed_unapproved_and_inactive(client, engine, accounts):
    headers = accounts['admin']
    result = client.get('/api/admin/skill-gaps', headers=headers)
    assert result.headers['cache-control'] == 'no-store'
    data = result.json()
    assert data['students'] == 1 and data['jobs'] == 1
    skill = next(row for row in data['items'] if row['skill_id'] == accounts['skill_id'])
    assert skill['students_with_skill'] == 1 and skill['students_missing_skill'] == 0
    assert skill['coverage_percent'] == 100
    assert client.get('/api/admin/skill-gaps?include_demo=true', headers=headers).json()['jobs'] == 4
    with Session(engine) as db, db.begin():
        db.get(Employer, accounts['company_id']).approved = False
    assert client.get('/api/admin/skill-gaps', headers=headers).json()['items'] == []
    with Session(engine) as db, db.begin():
        db.get(Employer, accounts['company_id']).approved = True
        db.get(Job, accounts['job_id']).is_active = False
    assert client.get('/api/admin/skill-gaps', headers=headers).json()['jobs'] == 0


def test_audit_persists_changes_and_filters_without_sensitive_content(client, engine, accounts):
    headers = accounts['admin']
    assert client.get('/api/admin/activity-logs', headers=headers).json()['total'] == 0
    assert client.patch(f"/api/admin/jobs/{accounts['job_id']}", headers=headers, json={'is_active': False}).status_code == 200
    assert client.post('/api/admin/skills', headers=headers, json={'name': 'Audit Skill'}).status_code == 201
    data = client.get('/api/admin/activity-logs?page_size=1', headers=headers).json()
    assert data['total'] == 2 and len(data['items']) == 1
    assert data['items'][0]['action'] == 'skill.created'
    page = client.get('/api/admin/activity-logs?page_size=1&page=2', headers=headers).json()
    assert page['items'][0]['changes'] == {'is_active': {'before': True, 'after': False}}
    filtered = client.get('/api/admin/activity-logs?action=job.access_changed', headers=headers).json()
    assert filtered['total'] == 1
    assert client.get('/api/admin/activity-logs?actor_id=99999', headers=headers).json()['total'] == 0
    assert client.post('/api/admin/skills', headers=headers, json={'name': 'Audit Skill'}).status_code == 409
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(AdminActivity)) == 2
    assert 'password' not in str(data) and 'email' not in str(data)


@pytest.mark.parametrize('path', ['/api/admin/skill-gaps', '/api/admin/activity-logs'])
def test_insights_require_admin(client, accounts, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers=accounts['student']).status_code == 403


def test_insight_filter_validation(client, accounts):
    for query in ['page=0', 'page_size=101', 'actor_id=0']:
        assert client.get('/api/admin/activity-logs?' + query, headers=accounts['admin']).status_code == 422
