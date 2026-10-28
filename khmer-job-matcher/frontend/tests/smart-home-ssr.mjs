import assert from 'node:assert/strict'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

// Render every demo route to catch runtime component/import errors without a browser.
const server = await createServer({ cacheDir: 'node_modules/.vite-ssr-smoke', server: { middlewareMode: true }, appType: 'custom' })
try {
  const { ApplicationRoutes } = await server.ssrLoadModule('/src/App.jsx')
  for (const route of ['/', '/jobs', '/companies', '/login', '/register', '/employer-register', '/forgot-password', '/verify-code', '/reset-password', '/oauth/callback']) {
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(ApplicationRoutes)))
    assert.ok(html.includes('Khmer'))
    assert.ok(html.includes(['/', '/jobs', '/companies'].includes(route) ? 'Website navigation' : 'au-card'))
    console.log('Rendered public route:', route)
  }
  const { AuthContext } = await server.ssrLoadModule('/src/hooks/auth-context.js')
  const cardProps = { skills: [], savedIds: [], pendingIds: [], canSave: true, savedLoading: false, showCoverage: false, toggle: () => {} }
  for (const [file, path, role] of [
    ['AdminDashboard', '/dashboard', 'admin'], ['EmployerDashboard', '/employer/company', 'employer'],
    ['EmployerDashboard', '/employer/applications', 'employer'], ['EmployerDashboard', '/employer/analytics', 'employer'],
    ...['', '/profile', '/resumes', '/recommendations', '/notifications'].map(suffix => ['Account', '/account' + suffix, 'student']),
  ]) {
    const { default: Page } = await server.ssrLoadModule(`/src/pages/${file}.jsx`)
    const tree = React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(AuthContext.Provider,
      { value: { user: { role, email: 'test@example.com' }, api: async () => ({}) } }, React.createElement(Page, { cardProps, onChanged: () => {} })))
    const html = renderToString(tree)
    assert.ok(html.length > 50)
    console.log('Rendered account page:', path)
  }
  const { default: Dashboard } = await server.ssrLoadModule('/src/smart-home/SmartHomeDashboard.jsx')
  for (const route of ['', '/devices', '/rooms', '/members', '/security', '/analytics']) {
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/smart-home' + route] }, React.createElement(Dashboard))).replace(/<!--.*?-->/g, '')
    assert.ok(html.includes('No physical devices are connected'))
    assert.ok(html.includes('My Devices'))
    assert.ok(!html.includes('undefined'))
    if (!route) {
      assert.ok(html.includes('Hello, Scarlett!'))
      assert.ok(html.includes('Living Room Temperature'))
      assert.ok(html.includes('73%'))
      assert.ok(html.includes('role="switch"'))
    }
    console.log('Rendered:', '/smart-home' + route)
  }
} finally { await server.close() }
