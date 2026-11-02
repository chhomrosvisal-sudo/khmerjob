import { useCallback, useEffect, useMemo, useState } from 'react'
import { request } from '../services/api'
import { AuthContext } from './auth-context'
import { SESSION_KEY, readSession, saveSession, clearSession } from '../services/session'
import { useI18n } from '../i18n/useI18n'

export function AuthProvider({ children }) {
  const { t } = useI18n()
  const [session, setSession] = useState(readSession)
  const [restoreError, setRestoreError] = useState('')
  const [retry, setRetry] = useState(0)
  const [message, setMessage] = useState('')
  const token = session?.token
  const api = useCallback(async (path, options = {}) => {
    try { return await request(path, { ...options, token }) }
    catch (error) {
      if (error.status === 401 && token) {
        clearSession(token)
        setSession(current => current?.token === token ? null : current)
        setMessage('Your session ended. Please sign in again.')
      }
      throw error
    }
  }, [token])
  useEffect(() => {
    if (!session || session.user) return
    const controller = new AbortController()
    request('/api/auth/me', { token: session.token, signal: controller.signal }).then(user => {
      if (!controller.signal.aborted) { setSession(current => current?.token === session.token ? { ...current, user } : current); setRestoreError('') }
    }, error => {
      if (controller.signal.aborted) return
      if (error.status === 401) {
        clearSession(session.token); setSession(null); setMessage('Your session ended. Please sign in again.')
      } else setRestoreError(error.message)
    })
    return () => controller.abort()
  }, [session, retry])
  useEffect(() => {
    function syncSession(event) {
      if (event.key === SESSION_KEY || event.key === null) {
        const stored = readSession()
        setSession(current => current?.token === stored?.token ? current : stored)
        setRestoreError('')
      }
    }
    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [])
  useEffect(() => {
    if (!session) return
    const timeout = setTimeout(() => {
      clearSession(session.token); setSession(null); setRestoreError(''); setMessage('Your session expired. Please sign in again.')
    }, Math.max(0, session.expiresAt - Date.now()))
    return () => clearTimeout(timeout)
  }, [session])
  const signIn = useCallback(async credentials => {
    const result = await request('/api/auth/login', { method: 'POST', body: credentials })
    const user = await request('/api/auth/me', { token: result.access_token })
    const next = { token: result.access_token, user, expiresAt: Date.now() + result.expires_in * 1000 }
    setMessage(saveSession(next) ? '' : 'Signed in for this visit. Browser storage is unavailable, so refreshing will require sign-in.')
    setRestoreError(''); setSession(next)
    return user
  }, [])
  const signInSocial = useCallback(async ({ provider, state, code, verifier }) => {
    const result = await request(`/api/auth/social/${provider}/complete`, { method: 'POST', timeoutMs: 45000, body: { state, code, verifier } })
    const user = await request('/api/auth/me', { token: result.access_token })
    const next = { token: result.access_token, user, expiresAt: Date.now() + result.expires_in * 1000 }
    setMessage(saveSession(next) ? '' : 'Signed in for this visit. Browser storage is unavailable, so refreshing will require sign-in.')
    setRestoreError(''); setSession(next)
    return user
  }, [])
  const signOut = useCallback(async () => {
    clearSession(token)
    setSession(null); setRestoreError('')
    let result = 'You have signed out.'
    try { await api('/api/auth/logout', { method: 'POST' }) }
    catch (error) { result = error.status === 401 ? 'Your session has ended.' : 'Signed out in this browser. The API could not revoke other sessions; they remain valid until expiry.' }
    setSession(null); setMessage(result)
  }, [api, token])
  const value = useMemo(() => ({ user: session?.user, api, signIn, signInSocial, signOut, message, sessionKey: token || 'guest' }), [session, api, signIn, signInSocial, signOut, message, token])
  return <AuthContext.Provider value={value}>{session && !session.user ? <section className="card auth-card"><h1>{t('Restoring your session')}</h1>{restoreError ? <><p role="alert">{t(restoreError)}</p><button onClick={() => { setRestoreError(''); setRetry(value => value + 1) }}>{t('Try again')}</button><button onClick={signOut}>{t('Sign out')}</button></> : <p role="status">{t('Checking your account?')}</p>}</section> : children}</AuthContext.Provider>
}
