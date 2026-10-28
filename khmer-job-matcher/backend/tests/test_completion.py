from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.core.config import get_settings
from app.models import User, Employer, PasswordReset
from app.ml.matching import normalize, similarities
from app.services import mailer

PASSWORD = 'workflow-test-password-123'


def auth(client, email, password=PASSWORD):
    response = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def seeker(client, email):
    assert client.post('/api/auth/register', json={'email': email, 'password': PASSWORD, 'name': 'Sokha'}).status_code == 201
    return auth(client, email)


def privileged(client, engine, role, email):
    with Session(engine) as db, db.begin():
        user = User(email=email, role=role, password_hash=hash_password(PASSWORD))
        db.add(user); db.flush()
        if role == 'employer':
            db.add(Employer(user_id=user.id, name=email.split('@')[0], is_demo=False))
    return auth(client, email)


def test_matching_and_preferences(client):
    headers = seeker(client, 'match@example.com')
    skills = client.get('/api/skills').json()
    selected = [skill['id'] for skill in skills if skill['name'] in ['React', 'JavaScript', 'HTML', 'CSS', 'Git']]
    assert client.patch('/api/students/me', headers=headers, json={'skill_ids': selected, 'interests': 'React frontend web development', 'experience': 'Built a React website', 'preferred_location': 'Phnom Penh', 'preferred_category': 'technology'}).status_code == 200
    response = client.post('/api/match', headers=headers)
    assert response.status_code == 200, response.text
    items = response.json()['items']
    assert len(items) == 4
    assert items[0]['job']['title'] == 'Junior Frontend Developer'
    assert items[0]['matched_skills']
    assert all(0 <= item['score'] <= 100 for item in items)
    assert client.post('/api/match').status_code == 401
    assert normalize('JS ReactJS') == 'javascript react'
    assert similarities('', ['something'])[0] == [0]
    assert similarities('ការងារកម្ពុជា', ['ការងារកម្ពុជា', 'unrelated'])[0][0] > .99


def test_employer_approval_company_profile_and_job_closure(client, engine):
    admin = privileged(client, engine, 'admin', 'admin-complete@example.com')
    created = client.post('/api/auth/employer-register', json={'email': 'new-employer@example.com', 'password': PASSWORD, 'company': 'New Employer'})
    assert created.status_code == 201 and created.json()['role'] == 'employer'
    employer = auth(client, 'new-employer@example.com')
    job = {'title': 'Python Developer', 'description': 'Python services', 'location': 'Phnom Penh', 'job_type': 'Full-time', 'salary_min': 400, 'salary_max': 800}
    assert client.post('/api/jobs', headers=employer, json=job).status_code == 403
    company = client.get('/api/employer/company', headers=employer).json()
    assert not company['approved']
    assert client.patch(f'/api/admin/companies/{company["id"]}', headers=admin, json={'approved': True}).status_code == 200
    response = client.post('/api/jobs', headers=employer, json=job)
    assert response.status_code == 201, response.text
    job_id = response.json()['id']
    assert client.get(f'/api/companies/{company["id"]}').json()['job_count'] == 1
    assert client.patch(f'/api/jobs/{job_id}/state', headers=employer, json={'is_active': False}).status_code == 200
    assert client.get(f'/api/jobs?company_id={company["id"]}').json()['total'] == 0
    student = seeker(client, 'closed-job@example.com')
    assert client.post(f'/api/applications/{job_id}', headers=student).status_code == 409
    assert client.get('/api/admin/overview', headers=student).status_code == 403
    assert client.get('/api/admin/overview', headers=admin).json()['pending_employers'] == 0
    assert client.get('/api/admin/companies?pending_only=true', headers=admin).json()['total'] == 0
    assert client.patch(f'/api/admin/users/{created.json()["id"]}', headers=admin, json={'is_active': False}).status_code == 200
    assert client.get('/api/auth/me', headers=employer).status_code == 401


def test_resume_application_review_authorization_and_notification(client, engine):
    student = seeker(client, 'resume-owner@example.com')
    other = seeker(client, 'resume-other@example.com')
    employer = privileged(client, engine, 'employer', 'hiring@example.com')
    foreign = privileged(client, engine, 'employer', 'foreign@example.com')
    created = client.post('/api/jobs', headers=employer, json={'title': 'Frontend', 'description': 'React', 'location': 'Remote', 'job_type': 'Internship'})
    job_id = created.json()['id']
    uploaded = client.post('/api/resumes?filename=cv.txt', headers={**student, 'Content-Type': 'application/octet-stream'}, content=b'Experienced with React, Python, HTML and CSS.')
    assert uploaded.status_code == 201, uploaded.text
    resume_id = uploaded.json()['id']
    assert uploaded.json()['detected_skill_ids']
    assert 'content' not in uploaded.json()
    assert client.get(f'/api/resumes/{resume_id}/file', headers=other).status_code == 404
    assert client.get(f'/api/resumes/{resume_id}/file', headers=student).content.startswith(b'Experienced')
    app = client.post(f'/api/applications/{job_id}', headers=student).json()
    assert app['resume_id'] == resume_id
    own = client.get('/api/employer/applications', headers=employer)
    assert own.status_code == 200, own.text
    assert own.json()['total'] == 1 and own.json()['items'][0]['has_resume']
    assert client.get('/api/employer/applications', headers=foreign).json()['total'] == 0
    assert client.get(f'/api/employer/applications/{app["id"]}/resume', headers=foreign).status_code == 404
    assert client.get(f'/api/employer/applications/{app["id"]}/resume', headers=employer).status_code == 200
    assert client.patch(f'/api/employer/applications/{app["id"]}', headers=employer, json={'status': 'accepted'}).status_code == 409
    assert client.patch(f'/api/employer/applications/{app["id"]}', headers=employer, json={'status': 'reviewing'}).status_code == 200
    updates = client.get('/api/notifications', headers=student).json()
    assert len(updates) == 1 and 'reviewing' in updates[0]['message']
    assert client.post(f'/api/notifications/{updates[0]["id"]}/read', headers=other).status_code == 404
    assert client.post(f'/api/notifications/{updates[0]["id"]}/read', headers=student).status_code == 204
    assert client.delete(f'/api/resumes/{resume_id}', headers=student).status_code == 204
    assert client.get(f'/api/employer/applications/{app["id"]}/resume', headers=employer).status_code == 404
    assert client.get('/api/applications', headers=student).json()['items'][0]['resume_id'] is None
    assert client.post('/api/resumes?filename=bad.pdf', headers=student, content=b'not a pdf').status_code == 422
    assert client.post('/api/resumes?filename=huge.txt', headers=student, content=b'a' * (5 * 1024 * 1024 + 1)).status_code == 413
    large = b'Python React skills.\n' * 60000
    chunked = client.post('/api/resumes?filename=larger.txt', headers=student, content=large)
    assert chunked.status_code == 201
    assert client.get(f'/api/resumes/{chunked.json()["id"]}/file', headers=student).content == large


def test_real_recovery_tokens_are_one_use_and_revoke_sessions(client, engine, monkeypatch):
    headers = seeker(client, 'recover@example.com')
    sent = []
    monkeypatch.setattr(mailer, 'configured', lambda: True)
    monkeypatch.setattr(mailer, 'send_recovery', lambda email, code: sent.append((email, code)))
    requested = client.post('/api/auth/password/request', json={'email': 'recover@example.com'})
    assert requested.status_code == 200
    request_id = requested.json()['request_id']
    code = sent[0][1]
    assert code not in str(requested.json())
    unknown = client.post('/api/auth/password/request', json={'email': 'unknown@example.com'})
    assert unknown.status_code == 200 and len(sent) == 1
    assert unknown.json()['message'] == requested.json()['message']
    with Session(engine) as db:
        row = db.get(PasswordReset, request_id)
        assert row.code_hash != code and row.token_hash is None
    invalid = client.post('/api/auth/password/verify', json={'request_id': request_id, 'code': '000000' if code != '000000' else '999999'})
    assert invalid.status_code == 400
    verified = client.post('/api/auth/password/verify', json={'request_id': request_id, 'code': code})
    assert verified.status_code == 200, verified.text
    token = verified.json()['reset_token']
    new_password = 'new-secure-password-123'
    payload = {'request_id': request_id, 'token': token, 'password': new_password}
    assert client.post('/api/auth/password/reset', json=payload).status_code == 204
    assert client.post('/api/auth/password/reset', json=payload).status_code == 400
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'recover@example.com', 'password': PASSWORD}).status_code == 401
    assert auth(client, 'recover@example.com', new_password)


def test_login_throttling_and_unconfigured_mail(client, monkeypatch):
    monkeypatch.setattr(get_settings(), 'rate_limit_enabled', True)
    payload = {'email': 'rate@example.com', 'password': PASSWORD}
    for _ in range(10):
        assert client.post('/api/auth/login', json=payload).status_code == 401
    assert client.post('/api/auth/login', json=payload).status_code == 429
    monkeypatch.setattr(mailer, 'configured', lambda: False)
    assert client.post('/api/auth/password/request', json={'email': 'rate@example.com'}).status_code == 503
