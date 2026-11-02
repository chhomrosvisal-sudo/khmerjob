import test from 'node:test'
import assert from 'node:assert/strict'
import { SESSION_KEY, readSession, saveSession, clearSession } from '../src/services/session.js'

function memoryStorage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

test('saved credentials survive reload without trusting cached roles or user details', () => {
  const storage = memoryStorage()
  const session = { token: 'signed-token', expiresAt: 2000, user: { role: 'admin' } }
  assert.equal(saveSession(session, storage), true)
  assert.deepEqual(readSession(storage, 1000), { token: 'signed-token', expiresAt: 2000 })
  assert.ok(!storage.getItem(SESSION_KEY).includes('admin'))
  storage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: { role: 'admin' } }))
  assert.equal(readSession(storage, 1000).user, undefined)
})

test('expired and malformed saved sessions are removed', () => {
  const storage = memoryStorage()
  for (const value of ['broken json', JSON.stringify({ token: 'old', expiresAt: 1000 }), JSON.stringify({ token: '', expiresAt: 3000 }), JSON.stringify({ token: 42, expiresAt: 3000 }), JSON.stringify({ token: 'old', expiresAt: '3000' })]) {
    storage.setItem(SESSION_KEY, value)
    assert.equal(readSession(storage, 1000), null)
    assert.equal(storage.getItem(SESSION_KEY), null)
  }
})

test('logout clears saved sign-in and late failures do not clear a newer login', () => {
  const storage = memoryStorage()
  saveSession({ token: 'new-token', expiresAt: 5000 }, storage)
  clearSession('old-token', storage)
  assert.equal(readSession(storage, 1000).token, 'new-token')
  clearSession('new-token', storage)
  assert.equal(readSession(storage, 1000), null)
})

test('blocked browser storage does not crash sign-in or sign-out', () => {
  const blocked = { getItem() { throw Error('Blocked') }, setItem() { throw Error('Blocked') }, removeItem() { throw Error('Blocked') } }
  assert.equal(readSession(blocked), null)
  assert.equal(saveSession({ token: 'token', expiresAt: 5000 }, blocked), false)
  assert.doesNotThrow(() => clearSession('token', blocked))
  assert.equal(readSession(null), null)
})
