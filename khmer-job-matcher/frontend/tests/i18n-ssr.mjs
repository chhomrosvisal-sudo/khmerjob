import assert from 'node:assert/strict'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const server = await createServer({ cacheDir: 'node_modules/.vite-i18n-smoke', server: { middlewareMode: true }, appType: 'custom' })
let checks = 0
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/i18n/LanguageContext.jsx')
  const { ApplicationRoutes } = await server.ssrLoadModule('/src/App.jsx')
  const { AuthContext } = await server.ssrLoadModule('/src/hooks/auth-context.js')
  const { translate } = await server.ssrLoadModule('/src/i18n/core.js')
  const { default: JobCard } = await server.ssrLoadModule('/src/components/JobCard.jsx')
  for (const language of ['en', 'km', 'zh']) {
    for (const [route, heading] of [['/', 'Find Your Dream Job in Cambodia'], ['/jobs', 'Find your next opportunity'],
      ['/companies', 'Companies in Cambodia'], ['/login', 'Login'], ['/register', 'Sign up'],
      ['/employer-register', 'Employer sign up'], ['/forgot-password', 'Forgot your password?']]) {
      const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(ApplicationRoutes, { initialLanguage: language })))
      assert.ok(html.includes(translate(language, heading)), `${language} ${route}`)
      assert.ok(html.includes(translate(language, 'Switch to night mode')), `${language} theme control`)
      assert.ok(html.includes('value="zh"') && html.includes('value="km"') && html.includes('value="en"'), route)
      checks++
    }
    function shell(child, route = '/dashboard') {
      return React.createElement(LanguageProvider, { initialLanguage: language }, React.createElement(MemoryRouter, { initialEntries: [route] },
        React.createElement(AuthContext.Provider, { value: { user: { role: 'admin', email: 'test@example.com' }, api: async () => ({}) } }, child)))
    }
    for (const [file, heading, route] of [
      ['AdminDashboard', 'Recruitment overview', '/dashboard'], ['EmployerDashboard', 'Employer workspace', '/employer/company'],
      ['Recommendations', 'Recommended jobs', '/account/recommendations'], ['Profile', 'My profile', '/account/profile'],
    ]) {
      const { default: Page } = await server.ssrLoadModule(`/src/pages/${file}.jsx`)
      const html = renderToString(shell(React.createElement(Page, { cardProps: { savedIds: [], pendingIds: [] } }), route))
      assert.ok(html.includes(translate(language, heading)), `${language} ${file}`)
      checks++
    }
    const html = renderToString(shell(React.createElement(JobCard, { job: { id: 1, title: 'Customer Service', employer: { name: 'Home' },
      requirements: [], location: 'Phnom Penh', job_type: 'Full-time', salary_min: 500, salary_max: 900, created_at: '2026-10-20' }, skills: [], canSave: false })))
    // Original employer data must not be replaced even when it coincides with a dictionary key.
    assert.ok(html.includes('Customer Service') && html.includes('>Home<'))
    assert.ok(html.includes(translate(language, 'Full-time')))
    checks++
    const { default: SmartHome } = await server.ssrLoadModule('/src/smart-home/SmartHomeDashboard.jsx')
    const smart = renderToString(shell(React.createElement(SmartHome), '/smart-home'))
    assert.ok(smart.includes(translate(language, 'My Devices')))
    assert.ok(smart.includes(translate(language, 'Refrigerator')))
    checks++
  }
  console.log(`Passed ${checks} multilingual rendering checks across English, Khmer and Simplified Chinese.`)
} finally { await server.close() }
