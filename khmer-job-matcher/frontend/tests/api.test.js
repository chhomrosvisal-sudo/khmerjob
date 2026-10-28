import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { request, queryString } from '../src/services/api.js'
import { coverage } from '../src/services/coverage.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('requests attach bearer tokens and serialize JSON; no token is sent for guests', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ id: 42 }) }
  assert.deepEqual(await request('/api/students/me', { token: 'in-memory-token', method: 'PATCH', body: { name: 'Sokha' } }), { id: 42 })
  assert.equal(calls[0].url, 'http://127.0.0.1:8000/api/students/me')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer in-memory-token')
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: 'Sokha' })
  assert.equal(calls[0].options.cache, 'no-store')
  await request('/api/jobs')
  assert.equal(calls[1].options.headers.Authorization, undefined)
})

test('204 save/logout responses do not require JSON', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await request('/api/auth/logout', { method: 'POST' }), null)
})

test('API authorization and validation failures preserve status and useful details', async () => {
  globalThis.fetch = async () => Response.json({ error: { message: 'Invalid credentials' } }, { status: 401 })
  await assert.rejects(request('/api/auth/me'), error => error.status === 401 && error.message === 'Invalid credentials')
  globalThis.fetch = async () => Response.json({ error: { message: 'Invalid request', details: [{ location: ['body', 'name'], message: 'Cannot be blank' }] } }, { status: 422 })
  await assert.rejects(request('/api/students/me'), /name: Cannot be blank/)
})

test('network failures are explicit errors and never return demo data', async () => {
  globalThis.fetch = async () => { throw new TypeError('Network unavailable') }
  await assert.rejects(request('/api/jobs'), error => error.status === 0 && error.message.includes('Cannot reach the API'))
})

test('unexpected error JSON keeps HTTP status so unauthorized sessions can still be cleared', async () => {
  for (const payload of [null, [], { error: { details: 'unexpected format' } }, { error: { details: [null, {}, { location: 'body', message: 'Invalid field' }] } }]) {
    globalThis.fetch = async () => Response.json(payload, { status: 401 })
    await assert.rejects(request('/api/auth/me'), error => error.name !== 'TypeError' && error.status === 401 && Boolean(error.message))
  }
  globalThis.fetch = async () => Response.json({ detail: [{ loc: ['body', 'email'], msg: 'Invalid email' }] }, { status: 422 })
  await assert.rejects(request('/api/auth/login'), error => error.status === 422 && error.message === 'email: Invalid email')
})

test('aborted requests preserve abort behavior for stale result cancellation', async () => {
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(request('/api/jobs'), error => error.name === 'AbortError')
})

test('unreadable upstream responses are reported', async () => {
  globalThis.fetch = async () => new Response('<html>Gateway error</html>', { status: 502 })
  await assert.rejects(request('/api/jobs'), error => error.status === 502 && error.message.includes('unreadable'))
})

test('query strings encode search and pagination without losing boolean filters', () => {
  const params = new URLSearchParams(queryString({ q: 'React & CSS', page: 2, saved_only: false, location: '', absent: undefined }))
  assert.equal(params.get('q'), 'React & CSS')
  assert.equal(params.get('page'), '2')
  assert.equal(params.get('saved_only'), 'false')
  assert.equal(params.has('location'), false)
})

test('coverage uses required skill IDs, handles optional and absent requirements', () => {
  const job = { requirements: [{ skill: { id: 1, name: 'React' }, required: true }, { skill: { id: 2, name: 'Git' }, required: true }, { skill: { id: 3, name: 'SQL' }, required: false }] }
  assert.deepEqual(coverage(job, [{ id: 1 }, { id: 1 }, { id: 3 }]), { matched: ['React'], missing: ['Git'], score: 50 })
  assert.equal(coverage(job, []).score, 0)
  assert.equal(coverage({ requirements: [] }, [{ id: 1 }]).score, 0)
})
