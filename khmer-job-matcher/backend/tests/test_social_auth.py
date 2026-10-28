from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import OAuthFlow, SocialIdentity, StudentProfile, User
from app.routers import social_auth
from app.services import social_auth as provider_service
from test_completion import privileged, seeker

VERIFIER = 'browser-secret-' + 'a' * 43


@pytest.fixture
def configured(monkeypatch):
    for key, value in {'GOOGLE_CLIENT_ID': 'google-test-id', 'GOOGLE_CLIENT_SECRET': 'google-test-secret',
                       'FACEBOOK_APP_ID': 'facebook-test-id', 'FACEBOOK_APP_SECRET': 'facebook-test-secret',
                       'FACEBOOK_GRAPH_VERSION': 'v99.0'}.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()


def begin(client, provider='google', headers=None):
    result = client.post(f'/api/auth/social/{provider}/' + ('link' if headers else 'start'),
                         json={'verifier': VERIFIER}, headers=headers or {})
    assert result.status_code == 200, result.text
    return result.json()


def finish(client, flow, provider='google', **changes):
    return client.post(f'/api/auth/social/{provider}/complete', json={
        'state': flow['state'], 'verifier': VERIFIER, 'code': 'one-use-provider-code', **changes})


def account(client, response):
    assert response.status_code == 200, response.text
    return client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + response.json()['access_token']}).json()


def test_unconfigured_providers_are_explicit_and_secrets_not_exposed(client, monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', '')
    monkeypatch.setenv('FACEBOOK_APP_ID', '')
    get_settings.cache_clear()
    response = client.get('/api/auth/social/providers')
    assert response.json() == {'google': {'enabled': False}, 'facebook': {'enabled': False}}
    assert response.headers['cache-control'] == 'no-store'
    assert client.post('/api/auth/social/google/start', json={'verifier': VERIFIER}).status_code == 503
    assert client.post('/api/auth/social/apple/start', json={'verifier': VERIFIER}).status_code == 422


def test_social_registration_and_repeat_login_preserve_identity(client, engine, configured, monkeypatch):
    monkeypatch.setattr(social_auth, 'exchange_identity', lambda *args: {'subject': 'google-sub-1', 'email': 'social@example.com', 'name': 'Sokha'})
    flow = begin(client)
    params = parse_qs(urlparse(flow['authorization_url']).query)
    assert params['redirect_uri'] == ['http://localhost:5173/oauth/callback']
    assert params['code_challenge_method'] == ['S256']
    assert 'client_secret' not in flow['authorization_url']
    assert 'admin' not in flow['authorization_url']
    first = account(client, finish(client, flow))
    assert first['role'] == 'student'
    assert finish(client, flow).status_code == 400
    # Provider email changes do not replace the account or select another user.
    monkeypatch.setattr(social_auth, 'exchange_identity', lambda *args: {'subject': 'google-sub-1', 'email': 'changed@example.com', 'name': 'Changed'})
    assert account(client, finish(client, begin(client)))['id'] == first['id']
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(SocialIdentity)) == 1
        assert db.scalar(select(StudentProfile).where(StudentProfile.user_id == first['id'])).name == 'Sokha'
        artifact = db.scalar(select(OAuthFlow))
        assert artifact.id != flow['state'] and artifact.browser_hash != VERIFIER


def test_browser_binding_expiry_provider_mismatch_and_replay(client, engine, configured, monkeypatch):
    called = []
    monkeypatch.setattr(social_auth, 'exchange_identity', lambda *args: called.append(args))
    flow = begin(client)
    assert finish(client, flow, verifier='x' * 43).status_code == 400
    assert finish(client, flow, provider='facebook').status_code == 400
    with Session(engine) as db, db.begin():
        db.get(OAuthFlow, social_auth.digest(flow['state'])).expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
    assert finish(client, flow).status_code == 400
    assert not called


def test_email_collision_requires_authenticated_link_and_preserves_admin_role(client, engine, configured, monkeypatch):
    headers = privileged(client, engine, 'admin', 'admin-social@example.com')
    monkeypatch.setattr(social_auth, 'exchange_identity', lambda *args: {'subject': 'admin-google', 'email': 'admin-social@example.com', 'name': 'Untrusted Name'})
    assert finish(client, begin(client)).status_code == 409
    assert client.post('/api/auth/social/google/link', json={'verifier': VERIFIER}).status_code == 401
    linked = account(client, finish(client, begin(client, headers=headers)))
    assert linked['role'] == 'admin'
    assert account(client, finish(client, begin(client)))['id'] == linked['id']
    assert client.get('/api/auth/social/connections', headers=headers).json() == {'providers': ['google']}
    assert client.post('/api/auth/social/google/link', headers=headers, json={'verifier': VERIFIER}).status_code == 409


def test_link_cannot_steal_identity_and_logout_invalidates_pending_link(client, configured, monkeypatch):
    identity = {'subject': 'fb-user', 'email': 'fb@example.com', 'name': 'Facebook User'}
    monkeypatch.setattr(social_auth, 'exchange_identity', lambda *args: identity)
    account(client, finish(client, begin(client, 'facebook'), provider='facebook'))
    other = seeker(client, 'other-social@example.com')
    assert finish(client, begin(client, 'facebook', other), provider='facebook').status_code == 409
    identity['subject'] = 'another-facebook-user'
    pending = begin(client, 'facebook', other)
    assert client.post('/api/auth/logout', headers=other).status_code == 204
    assert finish(client, pending, provider='facebook').status_code == 401


def test_disabled_social_user_and_exchange_failure_are_not_sessions(client, engine, configured, monkeypatch):
    monkeypatch.setattr(social_auth, 'exchange_identity', lambda *args: {'subject': 'disabled-google', 'email': 'disabled-social@example.com', 'name': 'Disabled'})
    user = account(client, finish(client, begin(client)))
    with Session(engine) as db, db.begin():
        db.get(User, user['id']).is_active = False
    assert finish(client, begin(client)).status_code == 401
    def failure(*args):
        raise HTTPException(502, 'Provider unavailable')
    monkeypatch.setattr(social_auth, 'exchange_identity', failure)
    flow = begin(client)
    assert finish(client, flow).status_code == 502
    assert finish(client, flow).status_code == 400


def mock_transport(monkeypatch, handler):
    real_client = httpx.Client
    monkeypatch.setattr(provider_service.httpx, 'Client', lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))


def test_google_exchange_requires_verified_email_and_sanitizes_failures(configured, monkeypatch):
    mode = {'value': 'valid'}
    def handler(request):
        if request.url.host == 'oauth2.googleapis.com':
            assert request.method == 'POST'
            assert b'code_verifier=' in request.content and b'client_secret=' in request.content
            if mode['value'] == 'fail':
                return httpx.Response(400, json={'error': 'PRIVATE-SECRET'})
            return httpx.Response(200, json={'access_token': 'private-provider-token'})
        assert request.headers['authorization'] == 'Bearer private-provider-token'
        return httpx.Response(200, json={'sub': 'subject', 'email': 'google@example.com',
            'email_verified': mode['value'] != 'unverified', 'name': 'Google User'})
    mock_transport(monkeypatch, handler)
    assert provider_service.exchange_identity('google', 'code', VERIFIER)['subject'] == 'subject'
    mode['value'] = 'unverified'
    with pytest.raises(HTTPException) as error:
        provider_service.exchange_identity('google', 'code', VERIFIER)
    assert error.value.status_code == 400
    mode['value'] = 'fail'
    with pytest.raises(HTTPException) as error:
        provider_service.exchange_identity('google', 'code', VERIFIER)
    assert error.value.status_code == 502 and 'PRIVATE' not in error.value.detail


def test_facebook_exchange_checks_app_user_and_email(configured, monkeypatch):
    mode = {'value': 'valid'}
    def handler(request):
        if request.url.path.endswith('/oauth/access_token'):
            return httpx.Response(200, json={'access_token': 'fb-token'})
        if request.url.path.endswith('/debug_token'):
            assert request.headers['authorization'] == 'Bearer facebook-test-id|facebook-test-secret'
            return httpx.Response(200, json={'data': {'is_valid': True, 'app_id': 'wrong' if mode['value'] == 'wrong-app' else 'facebook-test-id', 'user_id': 'fb-subject'}})
        assert 'appsecret_proof' in request.url.params
        return httpx.Response(200, json={'id': 'wrong' if mode['value'] == 'wrong-user' else 'fb-subject',
            'email': None if mode['value'] == 'no-email' else 'fb@example.com', 'name': 'Facebook User'})
    mock_transport(monkeypatch, handler)
    assert provider_service.exchange_identity('facebook', 'code', VERIFIER)['email'] == 'fb@example.com'
    for scenario, status in [('wrong-app', 502), ('wrong-user', 502), ('no-email', 400)]:
        mode['value'] = scenario
        with pytest.raises(HTTPException) as error:
            provider_service.exchange_identity('facebook', 'code', VERIFIER)
        assert error.value.status_code == status
