import assert from 'node:assert/strict'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

// Exercise data-backed branches without a browser or modifying the real database.
const state = { error: '', empty: false, paths: [] }
globalThis.__adminRenderState = state
const server = await createServer({
  cacheDir: 'node_modules/.vite-admin-smoke',
  server: { middlewareMode: true, hmr: false }, appType: 'custom',
  plugins: [{
    name: 'admin-resource-fixtures', enforce: 'pre',
    resolveId(source) { if (source.endsWith('/hooks/useResource')) return '\0admin-resource-fixtures' },
    load(id) {
      if (id !== '\0admin-resource-fixtures') return
      return `export function useResource(api, path) {
        const state = globalThis.__adminRenderState;
        if (!path) return { data: null, loading: false, error: '', reload() {} };
        state.paths.push(path);
        if (path.startsWith('/api/admin/dashboard?')) return { data: state.error ? null : { start: '2026-01-01', end: '2026-01-31', students: 0, employers: 0, verified_companies: 0, active_jobs: 0, applications: 0, ai_matches: null, pending_jobs: null, pending_employers: 0, student_registrations: [], job_postings: [], application_statuses: [], top_skills: [], activities: [], notes: [] }, loading: false, error: state.error, reload() {} };
        const overview = { users: 24, students: 16, employers: 8, jobs: 12, applications: 7, pending_employers: 1, statuses: { submitted: 3, reviewing: 2, accepted: 2 } };
        const item = path.includes('/users?') ? { id: 1, email: 'admin@example.com', role: 'admin', is_active: true }
          : path.includes('/jobs?') ? { id: 2, title: 'Demo Developer', company: 'Test Company', is_active: true, is_demo: true }
          : { id: 3, name: 'Test Company', approved: false, is_demo: true };
        return { data: state.error ? null : path === '/api/skills' ? [{ id: 1, name: 'Python', name_km: null }] : path.endsWith('/overview') ? overview : { items: state.empty ? [] : [item], total: state.empty ? 0 : 1 }, loading: false, error: state.error, reload() {} };
      }`;
    },
  }],
})
try {
  const { default: Dashboard } = await server.ssrLoadModule('/src/pages/AdminDashboard.jsx')
  const { AuthContext } = await server.ssrLoadModule('/src/hooks/auth-context.js')
  function render(path) {
    state.paths = []
    return renderToString(React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(AuthContext.Provider, { value: { api: async () => ({}), user: { role: 'admin' } } }, React.createElement(Dashboard)))).replace(/<!--.*?-->/g, '')
  }
  const overview = render('/dashboard')
  assert.match(overview, /Application pipeline/)
  assert.match(overview, /Monthly student registrations/)
  assert.match(overview, /Export dashboard CSV/)
  assert.match(overview, /Not recorded yet/)
  assert.match(overview, /Test Company/)
  assert.match(overview, /value="3" max="7"/)
  assert.match(overview, /href="\/dashboard\/approvals"/)
  assert.ok(!overview.includes('hired'))
  const companies = render('/dashboard/companies?pending=1')
  assert.match(companies, /Approve employer/)
  assert.ok(state.paths.some(path => path.includes('pending_only=true')))
  assert.match(companies, /checked=""/)
  const users = render('/dashboard/users')
  assert.match(users, /admin@example.com/)
  assert.match(users, /disabled="" title="Admin accounts are managed locally"/)
  assert.match(render('/dashboard/jobs'), /Archive listing/)
  assert.match(render('/dashboard/students'), /Students/)
  assert.ok(state.paths.some(path => path.includes('role=student')))
  render('/dashboard/approvals')
  assert.ok(state.paths.some(path => path.includes('pending_only=true')))
  assert.match(render('/dashboard/skills'), /Python/)
  assert.match(render('/dashboard/reports'), /Platform summary/)
  const { default: AdminNavigation } = await server.ssrLoadModule('/src/components/layout/AdminNavigation.jsx')
  const navigation = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/dashboard/students'] }, React.createElement(AdminNavigation)))
  for (const label of ['OVERVIEW', 'MANAGEMENT', 'AI &amp; ANALYTICS', 'SYSTEM', 'Students', 'Employers', 'Job Listings', 'Applications', 'Approvals', 'Skills Management', 'AI Job Matching', 'Skill Gap Analytics', 'Reports', 'Notifications', 'Activity Logs', 'Settings']) assert.ok(navigation.includes(label), label)
  assert.equal((navigation.match(/disabled=""/g) || []).length, 2)
  assert.match(navigation, /aria-current="page"[^>]*href="\/dashboard\/students"/)
  state.empty = true
  assert.match(render('/dashboard'), /No employer accounts are waiting for approval/)
  assert.match(render('/dashboard/users'), /No records match this search/)
  state.error = 'Database unavailable'
  assert.match(render('/dashboard'), /role="alert"/)
  assert.match(render('/dashboard'), /Try again/)
  console.log('Admin data rendering passed: pipeline, approval filters, protected admin actions, jobs, empty states and errors.')
} finally {
  delete globalThis.__adminRenderState
  await server.close()
}
