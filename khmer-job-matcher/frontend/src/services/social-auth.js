import { request } from './api.js'
import { safeReturnPath } from './auth-navigation.js'

const FLOW_KEY = 'kjm-oauth-pending'

export function newVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function beginSocialSignIn(provider, { api = request, linking = false, next, storage = sessionStorage, navigate = url => window.location.assign(url) } = {}) {
  if (!['google', 'facebook'].includes(provider)) throw new Error('Unsupported sign-in provider.')
  const verifier = newVerifier()
  storage.setItem(FLOW_KEY, JSON.stringify({ pending: true }))
  try {
    const result = await api(`/api/auth/social/${provider}/${linking ? 'link' : 'start'}`, { method: 'POST', body: { verifier } })
    const url = new URL(result.authorization_url)
    const host = provider === 'google' ? 'accounts.google.com' : 'www.facebook.com'
    if (url.protocol !== 'https:' || url.hostname !== host) throw new Error('Invalid provider authorization address.')
    storage.setItem(FLOW_KEY, JSON.stringify({ provider, verifier, state: result.state,
      next: linking ? '/settings' : safeReturnPath(next), createdAt: Date.now() }))
    navigate(url.href)
  } catch (error) { storage.removeItem(FLOW_KEY); throw error }
}

export function readSocialCallback(search, storage = sessionStorage) {
  const params = new URLSearchParams(search)
  let flow
  try { flow = JSON.parse(storage.getItem(FLOW_KEY) || 'null') } catch { /* Invalid state is rejected below. */ }
  storage.removeItem(FLOW_KEY)
  if (!flow || !['google', 'facebook'].includes(flow.provider) || !flow.verifier || !flow.state ||
      params.get('state') !== flow.state || !Number.isFinite(flow.createdAt) ||
      Date.now() - flow.createdAt > 300000 || flow.createdAt > Date.now()) {
    throw new Error('This sign-in request expired or belongs to another tab. Start again from Login.')
  }
  if (params.has('error')) throw new Error('Sign-in was cancelled or permission was declined. You can try again or use email and password.')
  const code = params.get('code')
  if (!code) throw new Error('The provider did not return a sign-in code. Please try again.')
  return { ...flow, code }
}
