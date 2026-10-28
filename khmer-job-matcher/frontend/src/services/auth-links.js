import { safeReturnPath } from './auth-navigation.js'

export function authLink(path, params) {
  const next = new URLSearchParams()
  if (params.get('next')) next.set('next', safeReturnPath(params.get('next')))
  if (params.get('demo') === '1') next.set('demo', '1')
  if (params.get('portal') === 'employer' && path === '/login') next.set('portal', 'employer')
  return path + (next.size ? '?' + next.toString() : '')
}
