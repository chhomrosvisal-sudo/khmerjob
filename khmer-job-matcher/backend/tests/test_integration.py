"""Student/employer API integration flow against an isolated SQLite database."""
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Employer, User

PASSWORD = 'integration-password-123'


def login(client, email):
    response = client.post('/api/auth/login', json={'email': email, 'password': PASSWORD})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def register(client, email):
    response = client.post('/api/auth/register', json={'email': email, 'password': PASSWORD, 'name': 'Student'})
    assert response.status_code == 201, response.text
    return login(client, email)


def test_profile_jobs_saved_overview_and_logout(client):
    first = register(client, 'one@example.com')
    second = register(client, 'two@example.com')
    listing = client.get('/api/jobs').json()['items'][0]
    job_id = listing['id']
    skill_ids = [item['skill']['id'] for item in listing['requirements'] if item['required']]
    assert client.patch('/api/students/me', headers=first, json={'name': 'Sokha', 'skill_ids': skill_ids}).status_code == 200
    for _ in range(2):
        assert client.post(f'/api/saved-jobs/{job_id}', headers=first).status_code == 204
    assert client.get('/api/saved-jobs', headers=first).json() == [job_id]
    assert client.get('/api/saved-jobs', headers=second).json() == []
    assert client.get('/api/jobs?saved_only=true', headers=first).json()['total'] == 1
    assert client.get('/api/jobs?saved_only=true', headers=second).json()['total'] == 0
    overview = client.get('/api/students/me/overview', headers=first).json()
    assert overview['saved_count'] == 1
    assert overview['highest_coverage'] == 100
    assert overview['skills_count'] == len(skill_ids)
    assert overview['total_jobs'] == 4
    assert overview['recommended'][0]['id'] == job_id
    assert client.get('/api/jobs?saved_only=true&q=absent', headers=first).json()['items'] == []
    assert client.post('/api/saved-jobs/99999', headers=first).status_code == 404
    assert client.post(f'/api/auth/logout', headers=first).status_code == 204
    assert client.get('/api/saved-jobs', headers=first).status_code == 401
    first = login(client, 'one@example.com')
    assert client.get('/api/saved-jobs', headers=first).json() == [job_id]
    assert client.get('/api/students/me', headers=first).json()['name'] == 'Sokha'
    assert client.delete(f'/api/saved-jobs/{job_id}', headers=second).status_code == 204
    assert client.get('/api/saved-jobs', headers=first).json() == [job_id]
    for _ in range(2):
        assert client.delete(f'/api/saved-jobs/{job_id}', headers=first).status_code == 204
    assert client.get('/api/saved-jobs', headers=first).json() == []


def test_saved_jobs_and_owned_job_role_restrictions(client, engine):
    assert client.get('/api/jobs?saved_only=true').status_code == 401
    assert client.get('/api/saved-jobs').status_code == 401
    student = register(client, 'student@example.com')
    with Session(engine) as db, db.begin():
        user = User(email='employer@example.com', role='employer', password_hash=hash_password(PASSWORD))
        db.add(user); db.flush()
        db.add(Employer(user_id=user.id, name='Integration test employer', is_demo=False))
    employer = login(client, 'employer@example.com')
    assert client.get('/api/saved-jobs', headers=employer).status_code == 403
    assert client.post('/api/saved-jobs/1', headers=employer).status_code == 403
    assert client.get('/api/jobs?saved_only=true', headers=employer).status_code == 403
    assert client.get('/api/jobs?owned_only=true', headers=student).status_code == 403
    assert client.get('/api/jobs?owned_only=true').status_code == 401
    assert client.get('/api/jobs?owned_only=true', headers=employer).json()['items'] == []
    payload = {'title': 'Integration Engineer', 'description': 'Test listing', 'location': 'Remote', 'job_type': 'Internship'}
    created = client.post('/api/jobs', headers=employer, json=payload)
    assert created.status_code == 201, created.text
    owned = client.get('/api/jobs?owned_only=true', headers=employer).json()
    assert owned['total'] == 1 and owned['items'][0]['id'] == created.json()['id']
    assert client.patch(f"/api/jobs/{created.json()['id']}", headers=employer, json={'title': 'Updated'}).status_code == 200


def test_student_overview_without_skills(client):
    headers = register(client, 'empty@example.com')
    overview = client.get('/api/students/me/overview', headers=headers).json()
    assert overview['matched_jobs_count'] == 0
    assert overview['highest_coverage'] == 0
    assert overview['skills_count'] == 0
    assert overview['saved_count'] == 0
