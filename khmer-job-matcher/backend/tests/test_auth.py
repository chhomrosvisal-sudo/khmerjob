from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import AUDIENCE, ISSUER, hash_password, verify_password
from app.models import Employer, User

PASSWORD = 'correct-test-password-123'


def signup(client, email='student@example.com'):
    return client.post('/api/auth/register', json={'email': email, 'name': 'Sokha', 'password': PASSWORD})


def login(client, email):
    result = client.post('/api/auth/login', json={'email': email, 'password': PASSWORD})
    assert result.status_code == 200, result.text
    assert result.headers['cache-control'] == 'no-store'
    return {'Authorization': 'Bearer ' + result.json()['access_token']}


def privileged(engine, email, role):
    with Session(engine) as db, db.begin():
        user = User(email=email, password_hash=hash_password(PASSWORD), role=role)
        db.add(user)
        db.flush()
        if role == 'employer':
            db.add(Employer(user_id=user.id, name='Test employer', is_demo=False))


def test_registration_hashing_duplicate_and_no_role_escalation(client, engine):
    response = signup(client, 'Student@EXAMPLE.com')
    assert response.status_code == 201
    assert response.json()['email'] == 'student@example.com'
    assert response.json()['role'] == 'student'
    assert set(response.json()) == {'id', 'email', 'role'}
    with Session(engine) as db:
        user = db.scalar(select(User).where(User.email == 'student@example.com'))
        assert user.password_hash != PASSWORD and user.password_hash.startswith('$argon2id$')
        assert verify_password(PASSWORD, user.password_hash)
    assert signup(client).status_code == 409
    payload = {'email': 'other@example.com', 'name': 'Other', 'password': PASSWORD, 'role': 'admin'}
    assert client.post('/api/auth/register', json=payload).status_code == 422
    payload.pop('role')
    payload['password'] = 'short'
    assert client.post('/api/auth/register', json=payload).status_code == 422
    payload['password'] = PASSWORD
    payload['name'] = '   '
    assert client.post('/api/auth/register', json=payload).status_code == 422


def test_login_me_logout_revokes_all_tokens(client):
    signup(client)
    for email, password in [('missing@example.com', PASSWORD), ('student@example.com', 'wrong-password-123')]:
        response = client.post('/api/auth/login', json={'email': email, 'password': password})
        assert response.status_code == 401
        assert response.headers['www-authenticate'] == 'Bearer'
    headers = login(client, 'student@example.com')
    second = login(client, 'student@example.com')
    assert client.get('/api/auth/me', headers=headers).json()['role'] == 'student'
    assert client.post('/api/auth/logout', headers=headers).status_code == 204
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    assert client.get('/api/auth/me', headers=second).status_code == 401
    assert client.get('/api/auth/me', headers=login(client, 'student@example.com')).status_code == 200


def test_missing_invalid_expired_and_wrong_algorithm_tokens(client):
    signup(client)
    assert client.get('/api/auth/me').status_code == 401
    assert client.get('/api/students/me').status_code == 401
    assert client.post('/api/jobs', json={}).status_code == 401
    now = datetime.now(timezone.utc)
    claims = {'sub': '1', 'ver': 0, 'jti': 'test', 'iat': now - timedelta(minutes=5),
              'exp': now - timedelta(minutes=1), 'iss': ISSUER, 'aud': AUDIENCE}
    secret = get_settings().jwt_secret.get_secret_value()
    tokens = ['not-a-jwt', jwt.encode(claims, secret, algorithm='HS256')]
    claims['exp'] = now + timedelta(minutes=5)
    tokens += [jwt.encode(claims, 'wrong-secret-that-is-long-enough-123456', algorithm='HS256'),
               jwt.encode(claims, secret, algorithm='HS384')]
    for token in tokens:
        assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_student_profile_isolation_and_validation(client):
    signup(client, 'one@example.com'); signup(client, 'two@example.com')
    one = login(client, 'one@example.com'); two = login(client, 'two@example.com')
    skills = client.get('/api/skills').json()
    skill_id = skills[0]['id']
    response = client.patch('/api/students/me', headers=one,
        json={'name': 'Updated', 'education': 'University', 'interests': 'Technology', 'skill_ids': [skill_id]})
    assert response.status_code == 200, response.text
    assert response.json()['skills'][0]['id'] == skill_id
    assert client.get('/api/students/me', headers=two).json()['name'] == 'Sokha'
    for payload in [{'user_id': 2}, {'name': ' '}, {'name': None}, {'skill_ids': [9999]},
                    {'skill_ids': [skill_id, skill_id]}]:
        assert client.patch('/api/students/me', headers=one, json=payload).status_code == 422
    assert client.get('/api/students/me', headers=one).json()['name'] == 'Updated'
    assert client.patch('/api/students/2', headers=one, json={'name': 'Hijack'}).status_code == 404
    assert client.patch('/api/students/me', headers=one, json={'skill_ids': []}).json()['skills'] == []


def test_employer_ownership_and_role_guards(client, engine):
    privileged(engine, 'employer1@example.com', 'employer')
    privileged(engine, 'employer2@example.com', 'employer')
    signup(client)
    owner = login(client, 'employer1@example.com'); other = login(client, 'employer2@example.com')
    student = login(client, 'student@example.com')
    skill_id = client.get('/api/skills').json()[0]['id']
    payload = {'title': 'Junior Engineer', 'description': 'Build useful software.', 'location': 'Phnom Penh',
               'job_type': 'Full-time', 'requirements': [{'skill_id': skill_id}]}
    response = client.post('/api/jobs', headers=owner, json=payload)
    assert response.status_code == 201, response.text
    job = response.json(); path = f"/api/jobs/{job['id']}"
    assert job['is_demo'] is False
    assert client.patch(path, headers=other, json={'title': 'Hijack'}).status_code == 404
    assert client.patch(path, headers=student, json={'title': 'Hijack'}).status_code == 403
    assert client.post('/api/jobs', headers=student, json=payload).status_code == 403
    assert client.get('/api/students/me', headers=owner).status_code == 403
    updated = client.patch(path, headers=owner, json={'title': 'Updated role', 'requirements': [{'skill_id': skill_id, 'proficiency': 'intermediate'}]})
    assert updated.status_code == 200, updated.text
    assert updated.json()['requirements'][0]['proficiency'] == 'intermediate'
    assert client.get(path).json()['title'] == 'Updated role'
    assert client.patch('/api/jobs/1', headers=owner, json={'title': 'Claim demo'}).status_code == 404
    for data in ({'employer_id': job['employer']['id']}, {'is_demo': True}, {'title': ' '},
                 {'requirements': [{'skill_id': 9999}]}, {'requirements': [{'skill_id': skill_id}] * 2}, {}):
        assert client.patch(path, headers=owner, json=data).status_code == 422


def test_admin_routes_and_database_role_check(client, engine):
    privileged(engine, 'admin@example.com', 'admin')
    signup(client)
    admin = login(client, 'admin@example.com'); student = login(client, 'student@example.com')
    assert client.get('/api/admin/users').status_code == 401
    assert client.get('/api/admin/users', headers=student).status_code == 403
    assert client.post('/api/admin/skills', headers=student, json={'name': 'Testing'}).status_code == 403
    users = client.get('/api/admin/users', headers=admin)
    assert users.status_code == 200
    assert users.json()['total'] == 2
    assert 'password_hash' not in users.text and 'token_version' not in users.text
    assert client.post('/api/admin/skills', headers=admin, json={'name': 'Testing', 'name_km': 'ការធ្វើតេស្ត'}).status_code == 201
    assert client.post('/api/admin/skills', headers=admin, json={'name': 'Testing'}).status_code == 409
    with Session(engine) as db, db.begin():
        db.scalar(select(User).where(User.email == 'admin@example.com')).role = 'student'
    assert client.get('/api/admin/users', headers=admin).status_code == 403
