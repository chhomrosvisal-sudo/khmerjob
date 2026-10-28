import test from 'node:test'
import assert from 'node:assert/strict'
import { beginSocialSignIn, newVerifier, readSocialCallback } from '../src/services/social-auth.js'
import { postLoginPath } from '../src/services/auth-navigation.js'

function memoryStorage() {
  const items = new Map()
  return { setItem: (key, value) => items.set(key, value), getItem: key => items.get(key), removeItem: key => items.delete(key), items }
}

test('social sign-in stores browser binding only, supports callback once, and keeps safe destinations', async () => {
  const storage = memoryStorage()
  let destination, body
  const api = async (path, options) => {
    assert.equal(path, '/api/auth/social/google/start')
    body = options.body
    assert.match(body.verifier, /^[A-Za-z0-9_-]{43}$/)
    return { state: 'state-from-server', authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth?state=state-from-server' }
  }
  await beginSocialSignIn('google', { api, storage, next: '/jobs/42', navigate: url => { destination = url } })
  assert.match(destination, /^https:\/\/accounts.google.com\//)
  const pending = JSON.parse(storage.getItem('kjm-oauth-pending'))
  assert.equal(pending.verifier, body.verifier)
  assert.equal(pending.next, '/jobs/42')
  assert.equal('access_token' in pending, false)
  const flow = readSocialCallback('?code=provider-code&state=state-from-server', storage)
  assert.equal(flow.code, 'provider-code')
  assert.equal(storage.items.size, 0)
  assert.throws(() => readSocialCallback('?code=provider-code&state=state-from-server', storage), /another tab/)
  assert.equal(postLoginPath({ role: 'admin' }, flow.next), '/dashboard')
  assert.equal(postLoginPath({ role: 'student' }, flow.next), '/jobs/42')
})

test('social callbacks reject cancellation, stale transactions, and state substitution', () => {
  for (const [search, changes, message] of [
    ['?code=x&state=wrong', {}, /another tab/],
    ['?error=access_denied&state=expected', {}, /cancelled/],
    ['?state=expected', {}, /did not return/],
    ['?code=x&state=expected', { createdAt: 0 }, /expired/],
  ]) {
    const storage = memoryStorage()
    storage.setItem('kjm-oauth-pending', JSON.stringify({ provider: 'facebook', state: 'expected', verifier: newVerifier(), createdAt: Date.now(), ...changes }))
    assert.throws(() => readSocialCallback(search, storage), message)
    assert.equal(storage.items.size, 0)
  }
})

test('connecting providers uses authenticated endpoint and refuses untrusted redirects', async () => {
  const storage = memoryStorage()
  await beginSocialSignIn('facebook', { linking: true, storage, navigate: () => {}, api: async path => {
    assert.equal(path, '/api/auth/social/facebook/link')
    return { state: 'link-state', authorization_url: 'https://www.facebook.com/v99.0/dialog/oauth' }
  } })
  assert.equal(JSON.parse(storage.getItem('kjm-oauth-pending')).next, '/settings')
  await assert.rejects(beginSocialSignIn('google', { storage, api: async () => ({ state: 'x', authorization_url: 'https://evil.example/' }) }), /Invalid provider/)
  assert.equal(storage.items.size, 0)
  await assert.rejects(beginSocialSignIn('google', { storage: { setItem() { throw new Error('Storage disabled') } } }), /Storage disabled/)
})
