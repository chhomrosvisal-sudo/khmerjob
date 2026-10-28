import { useI18n } from '../../i18n/useI18n'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Apple, Facebook } from 'lucide-react'
import { request } from '../../services/api'
import { beginSocialSignIn } from '../../services/social-auth'
import { useAuth } from '../../hooks/useAuth'

export default function SocialLoginButtons({ register = false, linking = false }) {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const { api } = useAuth()
  const [providers, setProviders] = useState(null)
  const [connected, setConnected] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const demo = params.get('demo') === '1'
  useEffect(() => {
    if (demo) return
    let active = true
    Promise.all([request('/api/auth/social/providers'), linking ? api('/api/auth/social/connections') : Promise.resolve({ providers: [] })])
      .then(([available, connections]) => { if (active) { setProviders(available); setConnected(connections.providers); setError('') } })
      .catch(failure => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [api, linking, demo, revision])
  async function start(provider) {
    setBusy(provider); setError('')
    try { await beginSocialSignIn(provider, { api: linking ? api : request, linking, next: params.get('next') }) }
    catch (failure) { setError(failure.message || 'Sign-in could not start. Allow session storage and try again.'); setBusy('') }
  }
  return <section className="au-social" aria-label={linking ? t("Connected sign-in providers") : t("Social sign in")}>
    <div className="au-divider"><span>{linking ? t("Connect a sign-in account") : register ? t("Or sign up with") : t("Or login with")}</span></div>
    <div className="au-social-buttons">{['facebook', 'google'].map(provider => {
      const enabled = providers?.[provider]?.enabled && !demo
      const linked = connected.includes(provider)
      const title = provider === 'google' ? 'Google' : 'Facebook'
      return <button key={provider} type="button" aria-label={t(title)} onClick={() => start(provider)} disabled={!enabled || Boolean(busy) || linked}
        title={linked ? t("Already connected") : enabled ? `${linking ? 'Connect' : 'Continue with'} ${title}` : t("Provider setup required")}>
        {provider === 'facebook' ? <Facebook size={18} /> : <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12.2H12v3.1h4.5c-.6 2.2-2.4 3.4-4.5 3.4a6.7 6.7 0 1 1 4.3-11.8l2.4-2.3A10 10 0 1 0 22 12c0-.7-.1-1.4-.2-2H12v2.2" fill="#5d83d5" /></svg>}
        <span>{busy === provider ? t("Connecting?") : `${title}${linked ? ' ?' : ''}`}</span></button>
    })}<button type="button" aria-label="Apple" disabled title={t("Apple sign-in is not configured")}><Apple size={19} /><span>Apple</span></button></div>
    {demo ? <p>{t("Demo only: social sign-in is disabled.")}</p> : <p>{!providers ? t("Checking provider availability?") : ['google', 'facebook'].every(provider => providers[provider]?.enabled) ? t("Continue securely with your provider.") : t("Unavailable providers need backend configuration.")} {linking ? t("Connect only your own provider accounts. Existing roles stay unchanged.") : t("New social accounts are job-seeker accounts.")}{t(" Apple sign-in is not available.")}</p>}
    {error && <div role="alert"><p>{t(error)}</p><button type="button" onClick={() => setRevision(value => value + 1)} disabled={Boolean(busy)}>{t("Check availability again")}</button></div>}
  </section>
}
