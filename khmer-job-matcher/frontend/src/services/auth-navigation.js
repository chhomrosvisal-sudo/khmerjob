export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\s\\]/.test(value)) return '/dashboard'
  try {
    const url = new URL(value, 'http://local.invalid')
    if (url.origin !== 'http://local.invalid') return '/dashboard'
    const allowed = /^\/(dashboard|profile|matcher|settings)$/.test(url.pathname) || /^\/(smart-home|jobs|account)(?:\/|$)/.test(url.pathname) || /^\/employer\/jobs(?:\/|$)/.test(url.pathname)
    return allowed ? url.pathname + url.search + url.hash : '/dashboard'
  } catch { return '/dashboard' }
}

export function roleHome(role) {
  if (role === 'admin') return '/dashboard'
  if (role === 'employer') return '/employer/jobs'
  return '/jobs'
}

export function postLoginPath(user, requested) {
  if (user?.role === 'admin') return '/dashboard'
  const next = safeReturnPath(requested)
  const path = new URL(next, 'http://local.invalid').pathname
  if (user?.role === 'employer' && /^\/employer\/jobs(?:\/|$)/.test(path)) return next
  if (user?.role === 'student' && (/^\/(jobs|account)(?:\/|$)/.test(path) || ['/profile', '/matcher', '/settings'].includes(path))) return next
  return roleHome(user?.role)
}
