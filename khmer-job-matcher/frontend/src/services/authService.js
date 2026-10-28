import { request } from './api.js'

export const authService = {
  register: ({ firstName, lastName, email, password }) => request('/api/auth/register', {
    method: 'POST', body: { name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), password },
  }),
}

export const recoveryService = {
  request: email => request('/api/auth/password/request', { method: 'POST', body: { email } }),
  verify: (requestId, code) => request('/api/auth/password/verify', { method: 'POST', body: { request_id: requestId, code } }),
  reset: (requestId, token, password) => request('/api/auth/password/reset', { method: 'POST', body: { request_id: requestId, token, password } }),
}

// Prepared for a future Axios client. Pass axios.create({ baseURL: '/' }); never embed secrets.
export function createAxiosAuthService(client) {
  return { register: async ({ firstName, lastName, email, password }) => {
    const response = await client.post('/api/auth/register', { name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), password })
    return response.data
  } }
}

export const DEMO_CODE = '123456' // Public UI exercise code. It grants no account access.
export const RECOVERY_TTL_MS = 5 * 60 * 1000
export const RESEND_DELAY_MS = 30 * 1000
const delay = () => new Promise(resolve => setTimeout(resolve, 450))

export const demoRecovery = {
  request: async () => { await delay(); return 'Demo request accepted. No email was sent.' },
  verify: async ({ code, expiresAt, now = Date.now() }) => {
    await delay()
    if (!Number.isFinite(expiresAt) || now >= expiresAt) throw new Error('This demo code has expired. Request another code.')
    if (code !== DEMO_CODE) throw new Error('Invalid demo code. Use the displayed six-digit demo code.')
    return true
  },
  reset: async ({ verified, expiresAt } = {}) => {
    await delay()
    if (!verified || !Number.isFinite(expiresAt) || Date.now() >= expiresAt) throw new Error('Your preview expired. Start recovery again.')
    return 'Demo complete. No account password was changed.'
  },
}
