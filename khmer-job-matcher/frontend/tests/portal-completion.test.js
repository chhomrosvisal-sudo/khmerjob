import test from 'node:test'
import assert from 'node:assert/strict'
import { request } from '../src/services/api.js'
import { salaryLabel, postedLabel } from '../src/services/job-display.js'
import { validateAuthForm } from '../src/services/auth-validation.js'
import { categoryFor } from '../src/services/catalog.js'

test('private uploads send raw bytes with bearer authorization and downloads return blobs', async () => {
  const original = globalThis.fetch
  const body = new Blob(['Python and React'], { type: 'text/plain' })
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.body, body)
      assert.equal(options.headers.Authorization, 'Bearer private-token')
      assert.equal(options.headers['Content-Type'], 'application/octet-stream')
      return new Response(JSON.stringify({ id: 1 }), { status: 201 })
    }
    assert.deepEqual(await request('/api/resumes?filename=cv.txt', { method: 'POST', token: 'private-token', raw: true, body }), { id: 1 })
    globalThis.fetch = async () => new Response('private resume', { headers: { 'Content-Type': 'text/plain' } })
    const result = await request('/api/resumes/1/file', { token: 'private-token', responseType: 'blob' })
    assert.equal(await result.text(), 'private resume')
  } finally { globalThis.fetch = original }
})

test('job display uses actual salary/date data and curated categories', () => {
  assert.equal(salaryLabel({ salary_min: 400, salary_max: 800 }), '$400–$800 / month')
  assert.equal(salaryLabel({ salary_min: 0 }), 'From $0 / month')
  assert.equal(salaryLabel({}), 'Salary not disclosed')
  assert.equal(postedLabel(null), 'Posting date not provided')
  assert.equal(categoryFor({ title: 'Team Lead', category: 'banking' }).id, 'banking')
})

test('employer onboarding validates company and consent without accepting privilege input', () => {
  const values = { company: 'Mekong Company', email: 'employer@example.com', password: 'long-company-password', confirmPassword: 'long-company-password', terms: true }
  assert.deepEqual(validateAuthForm('employer-register', values), {})
  assert.ok(validateAuthForm('employer-register', { ...values, company: ' ' }).company)
  assert.ok(validateAuthForm('employer-register', { ...values, terms: false }).terms)
})
