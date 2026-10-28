from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PasswordReset, User
from app.reset_password import reset_account_password
from app.schemas.auth import Credentials
from test_completion import privileged, PASSWORD


def test_local_reset_preserves_admin_data_and_revokes_old_credentials(client, engine):
    headers = privileged(client, engine, 'admin', 'reset-admin@example.com')
    new_password = 'a-new-private-password-123'
    with Session(engine) as db, db.begin():
        user = db.scalar(select(User).where(User.email == 'reset-admin@example.com'))
        original_id, original_role = user.id, user.role
        db.add(PasswordReset(id='local-recovery-test', user_id=user.id, code_hash='test-code-hash',
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)))
    with Session(engine) as db, db.begin():
        reset_account_password(db, Credentials(email='RESET-ADMIN@example.com', password=new_password))
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'reset-admin@example.com', 'password': PASSWORD}).status_code == 401
    response = client.post('/api/auth/login', json={'email': 'reset-admin@example.com', 'password': new_password})
    assert response.status_code == 200
    result = client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + response.json()['access_token']}).json()
    assert result['id'] == original_id and result['role'] == original_role
    with Session(engine) as db:
        assert db.get(PasswordReset, 'local-recovery-test').used
        with pytest.raises(ValueError, match='Account not found'):
            reset_account_password(db, Credentials(email='missing@example.com', password=new_password))
