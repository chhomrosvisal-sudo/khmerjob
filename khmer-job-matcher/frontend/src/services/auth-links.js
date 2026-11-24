import { safeReturnPath } from './auth-navigation.js'

export function authLink(path, params) {
  const workspace = ['workspace', 'employer'].includes(params.get('portal'))
  if (path === '/login' && workspace) path = '/workspace-login'
  const next = new URLSearchParams()
  if (params.get('next')) next.set('next', safeReturnPath(params.get('next')))
  if (params.get('demo') === '1') next.set('demo', '1')
  if (workspace && path !== '/register' && path !== '/workspace-login') next.set('portal', 'workspace')
  return path + (next.size ? '?' + next.toString() : '')
}
