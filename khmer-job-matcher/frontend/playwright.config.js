import { defineConfig } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const isolated = path.join(projectRoot, '.local-run', 'e2e', randomUUID())
mkdirSync(isolated, { recursive: true })
const email = 'admin@example.com'
const password = randomBytes(24).toString('hex')
process.env.E2E_ADMIN_EMAIL = email
process.env.E2E_ADMIN_PASSWORD = password

export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 45000,
  use: { baseURL: 'http://localhost:5175', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: [
    { command: 'node e2e/start-backend.mjs', url: 'http://127.0.0.1:8011/api/health', reuseExistingServer: false,
      env: { APP_E2E: '1', DATABASE_URL: 'sqlite:///' + path.join(isolated, 'e2e.db').replaceAll('\\', '/'), JWT_SECRET: randomBytes(48).toString('hex'), RATE_LIMIT_ENABLED: 'false', SMTP_HOST: '', SMTP_FROM: '', E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password, ML_MODEL_DIR: path.join(isolated, 'models') } },
    { command: 'npm run dev -- --host localhost --port 5175 --strictPort', url: 'http://localhost:5175', reuseExistingServer: false,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:8011', VITE_API_BASE_URL: '/', VITE_CACHE_DIR: path.join(isolated, 'vite') } },
  ],
})
