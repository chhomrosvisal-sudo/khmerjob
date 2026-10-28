import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAuthForm, editOtp, maskEmail, passwordStrength } from '../src/services/auth-validation.js'
import { authLink } from '../src/services/auth-links.js'
import { authService, createAxiosAuthService, demoRecovery, DEMO_CODE } from '../src/services/authService.js'

const registration = { firstName: 'Sokha', lastName: 'Chan', email: 'sokha@example.com', phone: '+855 12 345 678', password: 'A secure passphrase 123!', confirmPassword: 'A secure passphrase 123!', terms: true }

test('auth forms validate email, password boundaries, name, optional phone, and consent', () => {
  assert.deepEqual(validateAuthForm('register', registration), {})
  assert.deepEqual(validateAuthForm('register', { ...registration, phone: '' }), {})
  assert.ok(validateAuthForm('login', { email: 'bad-email', password: 'short' }).email)
  assert.ok(validateAuthForm('login', { email: registration.email, password: 'a'.repeat(129) }).password)
  const errors = validateAuthForm('register', { ...registration, firstName: ' ', phone: 'not a phone', terms: false, confirmPassword: 'different' })
  for (const field of ['firstName', 'phone', 'terms', 'confirmPassword']) assert.ok(errors[field])
  assert.ok(validateAuthForm('register', { ...registration, firstName: 'a'.repeat(40), lastName: 'b'.repeat(40) }).lastName)
  assert.equal(passwordStrength('short').score, 1)
  assert.equal(passwordStrength(registration.password).score, 4)
})

test('OTP editing supports pasting, numeric filtering, and deleting a middle digit without shifting others', () => {
  assert.equal(editOtp('', 0, '123 456'), '123456')
  assert.equal(editOtp('123456', 2, ''), '12 456')
  assert.equal(editOtp('12 456', 2, '3'), '123456')
  assert.equal(editOtp('', 0, 'x1y2z3'), '123')
  assert.equal(editOtp('123456', 5, ''), '12345')
  assert.ok(validateAuthForm('verify', { code: '12 456' }).code)
  assert.deepEqual(validateAuthForm('verify', { code: '123456' }), {})
})

test('auth page links preserve safe dashboard destinations and explicit demo mode', () => {
  assert.equal(authLink('/register', new URLSearchParams('next=%2Fsmart-home%2Frooms&demo=1')), '/register?next=%2Fsmart-home%2Frooms&demo=1')
  assert.equal(authLink('/login', new URLSearchParams('next=https://example.com')), '/login?next=%2Fdashboard')
  assert.equal(maskEmail('sokha@example.com'), 'so•••@example.com')
})

test('registration sends only supported API fields and preserves the password exactly', async () => {
  const originalFetch = globalThis.fetch
  const password = '  a secure password  '
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).endsWith('/api/auth/register'))
      assert.deepEqual(JSON.parse(options.body), { name: 'Sokha Chan', email: 'sokha@example.com', password })
      return new Response(JSON.stringify({ id: 7, role: 'student', email: 'sokha@example.com' }), { status: 201 })
    }
    const result = await authService.register({ ...registration, password })
    assert.equal(result.id, 7)
    let payload
    const axiosService = createAxiosAuthService({ post: async (path, body) => { payload = { path, body }; return { data: { id: 8 } } } })
    assert.equal((await axiosService.register(registration)).id, 8)
    assert.equal(payload.path, '/api/auth/register')
    assert.equal(payload.body.name, 'Sokha Chan')
    assert.equal('phone' in payload.body, false)
  } finally { globalThis.fetch = originalFetch }
})

test('recovery preview validates code and expiry, sends no network requests, and never changes an account', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => { throw new Error('Recovery demo must not call the network') }
  try {
    assert.match(await demoRecovery.request(), /No email was sent/)
    await assert.rejects(demoRecovery.verify({ code: '000000', expiresAt: Date.now() + 60000 }), /Invalid demo code/)
    await assert.rejects(demoRecovery.verify({ code: DEMO_CODE, expiresAt: 0 }), /expired/)
    assert.equal(await demoRecovery.verify({ code: DEMO_CODE, expiresAt: Date.now() + 60000 }), true)
    await assert.rejects(demoRecovery.reset({ verified: false, expiresAt: Date.now() + 60000 }), /expired/)
    assert.match(await demoRecovery.reset({ verified: true, expiresAt: Date.now() + 60000 }), /No account password was changed/)
  } finally { globalThis.fetch = originalFetch }
})
