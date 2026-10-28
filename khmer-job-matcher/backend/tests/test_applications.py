from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models import User

PASSWORD = 'application-test-password-123'


def account(client, email):
    result = client.post('/api/auth/register', json={'name': 'Job Seeker', 'email': email, 'password': PASSWORD})
    assert result.status_code == 201
    assert result.json()['role'] == 'student'
    return login(client, email)


def login(client, email):
    result = client.post('/api/auth/login', json={'email': email, 'password': PASSWORD})
    assert result.status_code == 200
    return {'Authorization': 'Bearer ' + result.json()['access_token']}


def test_application_submission_persistence_duplicates_and_isolation(client):
    first = account(client, 'applicant-one@example.com')
    second = account(client, 'applicant-two@example.com')
    jobs = client.get('/api/jobs').json()['items']
    job_id = jobs[0]['id']
    submitted = client.post(f'/api/applications/{job_id}', headers=first)
    assert submitted.status_code == 201, submitted.text
    assert submitted.json()['status'] == 'submitted'
    assert submitted.json()['job']['id'] == job_id
    duplicate = client.post(f'/api/applications/{job_id}', headers=first)
    assert duplicate.status_code == 200
    assert duplicate.json()['id'] == submitted.json()['id']
    own = client.get('/api/applications', headers=first)
    assert own.status_code == 200
    assert own.json()['total'] == 1
    assert own.headers['cache-control'] == 'no-store'
    assert client.get('/api/applications', headers=second).json()['total'] == 0
    assert client.get(f'/api/applications?job_id={jobs[1]["id"]}', headers=first).json()['total'] == 0
    assert client.post('/api/auth/logout', headers=first).status_code == 204
    assert client.get('/api/applications', headers=first).status_code == 401
    assert client.get('/api/applications', headers=login(client, 'applicant-one@example.com')).json()['total'] == 1


def test_application_authorization_missing_jobs_and_pagination(client, engine):
    assert client.get('/api/applications').status_code == 401
    assert client.post('/api/applications/1').status_code == 401
    student = account(client, 'pagination@example.com')
    assert client.post('/api/applications/999999', headers=student).status_code == 404
    for query in ['page=0', 'page_size=101', 'job_id=-1']:
        assert client.get('/api/applications?' + query, headers=student).status_code == 422
    jobs = client.get('/api/jobs').json()['items']
    for job in jobs[:2]:
        assert client.post(f'/api/applications/{job["id"]}', headers=student).status_code == 201
    page = client.get('/api/applications?page=2&page_size=1', headers=student).json()
    assert page['total'] == 2 and len(page['items']) == 1
    for role in ['admin', 'employer']:
        email = f'{role}@example.com'
        with Session(engine) as db, db.begin():
            db.add(User(email=email, password_hash=hash_password(PASSWORD), role=role))
        privileged = login(client, email)
        assert client.get('/api/applications', headers=privileged).status_code == 403
        assert client.post('/api/applications/1', headers=privileged).status_code == 403
