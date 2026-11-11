import test from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath, postLoginPath, roleHome } from '../src/services/auth-navigation.js'
import { authLink } from '../src/services/auth-links.js'

test('employer registration and recovery preserve the employer portal', () => {
  const params = new URLSearchParams('portal=employer&next=/employer/applications')
  const registration = new URL(authLink('/register', params), 'http://local.invalid')
  assert.equal(registration.pathname, '/employer-register')
  assert.equal(registration.searchParams.get('next'), '/employer/applications')
  const recovery = new URL(authLink('/forgot-password', params), 'http://local.invalid')
  assert.equal(recovery.searchParams.get('portal'), 'employer')
  assert.equal(authLink('/register', new URLSearchParams()), '/register')
})

test('employers return to their workspace and students cannot enter it', () => {
  for (const path of ['/employer/applications?page=2', '/employer/company', '/employer/analytics']) {
    assert.equal(postLoginPath({ role: 'employer' }, path), path)
    assert.equal(postLoginPath({ role: 'student' }, path), '/')
  }
})

test('login destinations preserve private paths, searches, and anchors', () => {
  assert.equal(safeReturnPath('/smart-home'), '/smart-home')
  assert.equal(safeReturnPath('/smart-home/devices?q=lamp#status'), '/smart-home/devices?q=lamp#status')
  assert.equal(safeReturnPath('/profile'), '/profile')
  assert.equal(safeReturnPath('/admin/students?q=dara'), '/admin/students?q=dara')
  assert.equal(safeReturnPath('/dashboard/applications?page=2'), '/dashboard/applications?page=2')
  assert.equal(postLoginPath({ role: 'employer' }, '/notifications'), '/notifications')
  assert.equal(safeReturnPath('/employer/jobs/3/edit'), '/employer/jobs/3/edit')
})

test('job seekers return to jobs/accounts while admins always enter their dashboard', () => {
  const seeker = { role: 'student' }
  assert.equal(postLoginPath(seeker), '/')
  assert.equal(postLoginPath(seeker, '/'), '/')
  assert.equal(postLoginPath(seeker, '/jobs/3'), '/jobs/3')
  assert.equal(postLoginPath(seeker, '/account/applications'), '/account/applications')
  assert.equal(postLoginPath(seeker, '/dashboard'), '/')
  assert.equal(postLoginPath(seeker, '/smart-home/devices'), '/')
  assert.equal(postLoginPath(seeker, 'https://example.com'), '/')
  assert.equal(postLoginPath({ role: 'admin' }, '/jobs/3'), '/dashboard')
  assert.equal(postLoginPath({ role: 'admin' }, '/smart-home'), '/dashboard')
  assert.equal(postLoginPath({ role: 'employer' }), '/employer/jobs')
  assert.equal(postLoginPath({ role: 'employer' }, '/employer/jobs/3/edit'), '/employer/jobs/3/edit')
  assert.equal(roleHome('student'), '/')
})

test('login destinations reject external URLs, URL tricks, and login loops', () => {
  for (const path of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/login', '/register', '/smart-home-other', '/smart-home/../../login', '/smart-home\n']) {
    assert.equal(safeReturnPath(path), '/dashboard', String(path))
  }
})
