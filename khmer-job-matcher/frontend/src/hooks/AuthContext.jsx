import { useCallback, useEffect, useMemo, useState } from 'react'
import { request } from '../services/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  // Access tokens intentionally remain in memory. Refresh requires a new login.
  const [session, setSession] = useState(null)
  const [message, setMessage] = useState('')
  const token = session?.token
  const api = useCallback(async (path, options = {}) => {
    try { return await request(path, { ...options, token }) }
    catch (error) {
      if (error.status === 401 && token) {
        setSession(current => current?.token === token ? null : current)
        setMessage('Your session ended. Please sign in again.')
      }
      throw error
    }
  }, [token])
  useEffect(() => {
    if (!session) return
    const timeout = setTimeout(() => {
      setSession(null); setMessage('Your session expired. Please sign in again.')
    }, Math.max(0, session.expiresAt - Date.now()))
    return () => clearTimeout(timeout)
  }, [session])
  const signIn = useCallback(async credentials => {
    const result = await request('/api/auth/login', { method: 'POST', body: credentials })
    const user = await request('/api/auth/me', { token: result.access_token })
    setMessage('')
    setSession({ token: result.access_token, user, expiresAt: Date.now() + result.expires_in * 1000 })
    return user
  }, [])
  const signInSocial = useCallback(async ({ provider, state, code, verifier }) => {
    const result = await request(`/api/auth/social/${provider}/complete`, { method: 'POST', timeoutMs: 45000, body: { state, code, verifier } })
    const user = await request('/api/auth/me', { token: result.access_token })
    setMessage('')
    setSession({ token: result.access_token, user, expiresAt: Date.now() + result.expires_in * 1000 })
    return user
  }, [])
  const signOut = useCallback(async () => {
    let result = 'You have signed out.'
    try { await api('/api/auth/logout', { method: 'POST' }) }
    catch (error) { result = error.status === 401 ? 'Your session has ended.' : 'Signed out in this browser. The API could not revoke other sessions; they remain valid until expiry.' }
    setSession(null); setMessage(result)
  }, [api])
  const value = useMemo(() => ({ user: session?.user, api, signIn, signInSocial, signOut, message, sessionKey: token || 'guest' }), [session, api, signIn, signInSocial, signOut, message, token])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
