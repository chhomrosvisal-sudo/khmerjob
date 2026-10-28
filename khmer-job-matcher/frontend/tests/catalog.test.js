import test from 'node:test'
import assert from 'node:assert/strict'
import { categories, categoryFor, groupEmployers, initials, loadCatalog } from '../src/services/catalog.js'

test('category suggestions use job titles and skills and preserve an uncategorized result', () => {
  assert.equal(categories.length, 10)
  assert.equal(categoryFor({ title: 'Junior Frontend Developer' }).id, 'technology')
  assert.equal(categoryFor({ title: 'Accountant' }).id, 'accounting')
  assert.equal(categoryFor({ title: 'Customer Support Agent' }).id, 'customer-service')
  assert.equal(categoryFor({ title: 'Team member', requirements: [{ skill: { name: 'React' } }] }).id, 'technology')
  assert.equal(categoryFor({ title: 'Delivery Driver' }).id, 'other')
})

test('employer counts group by identity, including employers with identical names', () => {
  const company = { id: 1, name: 'Mekong Studio', is_demo: true }
  const grouped = groupEmployers([{ employer: company }, { employer: company }, { employer: { ...company, id: 2 } }])
  assert.equal(grouped.length, 2)
  assert.equal(grouped[0].count, 2)
  assert.equal(grouped[0].is_demo, true)
  assert.equal(grouped[1].count, 1)
  assert.equal(initials(' Mekong Digital Studio '), 'MD')
  assert.deepEqual(groupEmployers([]), [])
})

test('catalog loads every API page, preserves filters, and forwards request cancellation', async () => {
  const requests = []
  const controller = new AbortController()
  const api = async (path, options) => {
    const params = new URLSearchParams(path.split('?')[1])
    requests.push(params)
    assert.equal(options.signal, controller.signal)
    assert.equal(params.get('q'), 'React & SQL')
    assert.equal(params.get('saved_only'), 'true')
    assert.equal(params.get('location'), 'Phnom Penh')
    const page = Number(params.get('page'))
    return { items: Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({ id: (page - 1) * 100 + index + 1 })), total: 101 }
  }
  const result = await loadCatalog(api, { q: 'React & SQL', location: 'Phnom Penh', saved_only: true }, { signal: controller.signal })
  assert.equal(requests.length, 2)
  assert.equal(result.length, 101)
  assert.equal(result[100].id, 101)
})

test('catalog stops on empty pages and propagates failures instead of returning local demo jobs', async () => {
  assert.deepEqual(await loadCatalog(async () => ({ items: [], total: 1000 })), [])
  await assert.rejects(loadCatalog(async () => { throw new Error('Backend unavailable') }), /Backend unavailable/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(loadCatalog(async (path, options) => { options.signal.throwIfAborted() }, {}, { signal: controller.signal }), { name: 'AbortError' })
})
