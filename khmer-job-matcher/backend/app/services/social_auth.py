"""Server-side provider exchanges. Provider tokens never reach the browser or database."""
import base64
import hashlib
import hmac
import re
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from pydantic import EmailStr, TypeAdapter, ValidationError

from app.core.config import get_settings


def provider_config(provider):
    settings = get_settings()
    if provider == 'google':
        client_id, secret = settings.google_client_id, settings.google_client_secret.get_secret_value()
        authorize = 'https://accounts.google.com/o/oauth2/v2/auth'
        token_url = 'https://oauth2.googleapis.com/token'
    elif provider == 'facebook':
        client_id, secret = settings.facebook_app_id, settings.facebook_app_secret.get_secret_value()
        version = settings.facebook_graph_version
        if not re.fullmatch(r'v\d+\.\d+', version):
            raise HTTPException(503, 'Facebook sign-in needs an app ID, app secret, and Graph API version.')
        authorize = f'https://www.facebook.com/{version}/dialog/oauth'
        token_url = f'https://graph.facebook.com/{version}/oauth/access_token'
    else:
        raise HTTPException(404, 'Unknown sign-in provider')
    if not client_id.strip() or not secret.strip():
        raise HTTPException(503, f'{provider.title()} sign-in is not configured yet.')
    return client_id, secret, authorize, token_url


def redirect_uri():
    return get_settings().frontend_origin.rstrip('/') + '/oauth/callback'


def authorization_url(provider, state, verifier):
    client_id, _, authorize, _ = provider_config(provider)
    params = {'client_id': client_id, 'redirect_uri': redirect_uri(), 'response_type': 'code',
              'state': state, 'scope': 'openid email profile' if provider == 'google' else 'email,public_profile'}
    if provider == 'google':
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
        params.update(code_challenge=challenge, code_challenge_method='S256', prompt='select_account')
    return authorize + '?' + urlencode(params)


def exchange_identity(provider, code, verifier):
    client_id, secret, _, token_url = provider_config(provider)
    try:
        with httpx.Client(timeout=12, follow_redirects=False) as client:
            params = {'client_id': client_id, 'client_secret': secret, 'code': code, 'redirect_uri': redirect_uri()}
            if provider == 'google':
                params.update(grant_type='authorization_code', code_verifier=verifier)
                response = client.post(token_url, data=params)
            else:
                response = client.get(token_url, params=params)
            response.raise_for_status()
            token = response.json()['access_token']
            if not isinstance(token, str) or not token:
                raise ValueError('No access token')
            headers = {'Authorization': f'Bearer {token}'}
            if provider == 'google':
                info = client.get('https://openidconnect.googleapis.com/v1/userinfo', headers=headers)
                info.raise_for_status()
                identity = info.json()
                if identity.get('email_verified') is not True:
                    raise HTTPException(400, 'Google must provide a verified email address. Verify it with Google first.')
                subject = identity.get('sub')
            else:
                base = f'https://graph.facebook.com/{get_settings().facebook_graph_version}'
                debug = client.get(base + '/debug_token', params={'input_token': token},
                                   headers={'Authorization': f'Bearer {client_id}|{secret}'})
                debug.raise_for_status()
                data = debug.json()['data']
                if data.get('is_valid') is not True or str(data.get('app_id')) != client_id:
                    raise ValueError('Invalid Facebook app token')
                proof = hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()
                info = client.get(base + '/me', params={'fields': 'id,name,email', 'appsecret_proof': proof}, headers=headers)
                info.raise_for_status()
                identity = info.json()
                subject = identity.get('id')
                if str(data.get('user_id')) != str(subject):
                    raise ValueError('Facebook user mismatch')
            if not isinstance(subject, str) or not 1 <= len(subject) <= 255:
                raise ValueError('Invalid provider identity')
            try:
                email = str(TypeAdapter(EmailStr).validate_python(identity.get('email')))
            except ValidationError:
                raise HTTPException(400, 'This provider did not share a valid email. Allow email access or use email/password sign-in.') from None
            if len(email) > 254:
                raise HTTPException(400, 'The provider email exceeds the supported length. Use another sign-in account.')
            name = identity.get('name')
            return {'subject': subject, 'email': email, 'name': name[:80] if isinstance(name, str) and name.strip() else email.split('@')[0][:80]}
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        # Do not expose authorization codes, secrets, tokens, response bodies, or request URLs.
        raise HTTPException(502, 'Provider sign-in could not be verified. Please start again or use email/password.') from None
