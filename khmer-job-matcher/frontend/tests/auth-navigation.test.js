import test from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath, postLoginPath, roleHome } from '../src/services/auth-navigation.js'

test('login destinations preserve private paths, searches, and anchors', () => {
  assert.equal(safeReturnPath('/smart-home'), '/smart-home')
  assert.equal(safeReturnPath('/smart-home/devices?q=lamp#status'), '/smart-home/devices?q=lamp#status')
  assert.equal(safeReturnPath('/profile'), '/profile')
  assert.equal(safeReturnPath('/employer/jobs/3/edit'), '/employer/jobs/3/edit')
})

test('job seekers return to jobs/accounts while admins always enter their dashboard', () => {
  const seeker = { role: 'student' }
  assert.equal(postLoginPath(seeker), '/jobs')
  assert.equal(postLoginPath(seeker, '/jobs/3'), '/jobs/3')
  assert.equal(postLoginPath(seeker, '/account/applications'), '/account/applications')
  assert.equal(postLoginPath(seeker, '/dashboard'), '/jobs')
  assert.equal(postLoginPath(seeker, '/smart-home/devices'), '/jobs')
  assert.equal(postLoginPath(seeker, 'https://example.com'), '/jobs')
  assert.equal(postLoginPath({ role: 'admin' }, '/jobs/3'), '/dashboard')
  assert.equal(postLoginPath({ role: 'admin' }, '/smart-home'), '/dashboard')
  assert.equal(postLoginPath({ role: 'employer' }), '/employer/jobs')
  assert.equal(postLoginPath({ role: 'employer' }, '/employer/jobs/3/edit'), '/employer/jobs/3/edit')
  assert.equal(roleHome('student'), '/jobs')
})

test('login destinations reject external URLs, URL tricks, and login loops', () => {
  for (const path of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/login', '/register', '/smart-home-other', '/smart-home/../../login', '/smart-home\n']) {
    assert.equal(safeReturnPath(path), '/dashboard', String(path))
  }
})
