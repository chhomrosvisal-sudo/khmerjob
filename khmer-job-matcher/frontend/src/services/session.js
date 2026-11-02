export const SESSION_KEY = 'kjm-auth-session'

function browserStorage() {
  try { return globalThis.localStorage } catch { return null }
}

// Persist credentials only; roles and user details are always fetched from /me.
export function readSession(storage = browserStorage(), now = Date.now()) {
  try {
    const saved = JSON.parse(storage?.getItem(SESSION_KEY) || 'null')
    if (!saved) return null
    if (typeof saved.token !== 'string' || !saved.token || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= now) {
      storage?.removeItem(SESSION_KEY)
      return null
    }
    return { token: saved.token, expiresAt: saved.expiresAt }
  } catch {
    try { storage?.removeItem(SESSION_KEY) } catch { /* Browser storage may be disabled. */ }
    return null
  }
}

export function saveSession(session, storage = browserStorage()) {
  try {
    if (!storage) return false
    storage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, expiresAt: session.expiresAt }))
    return true
  } catch { return false }
}

export function clearSession(token, storage = browserStorage()) {
  try {
    if (!token || JSON.parse(storage?.getItem(SESSION_KEY) || 'null')?.token === token) storage?.removeItem(SESSION_KEY)
  } catch { /* Signing out still clears the in-memory session. */ }
}
