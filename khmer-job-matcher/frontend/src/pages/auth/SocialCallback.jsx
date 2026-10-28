import { useI18n } from '../../i18n/useI18n'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { readSocialCallback } from '../../services/social-auth'
import { postLoginPath } from '../../services/auth-navigation'
import AuthLayout from '../../layouts/AuthLayout'

export default function SocialCallback() {
  const { t } = useI18n()
  const { signInSocial } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pending = useRef(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (!pending.current) pending.current = (async () => {
      let flow
      try { flow = readSocialCallback(location.search) }
      finally { window.history.replaceState(window.history.state, '', '/oauth/callback') }
      const user = await signInSocial(flow)
      return postLoginPath(user, flow.next)
    })()
    pending.current.then(path => { if (active) navigate(path, { replace: true }) })
      .catch(failure => { if (active) setError(failure.message || 'Sign-in failed. Please try again.') })
    return () => { active = false }
  }, [location.search, navigate, signInSocial])
  return <AuthLayout variant="login"><div className="au-heading"><h1>{error ? t("Sign-in needs attention") : t("Completing sign-in")}</h1></div>
    {error ? <><p role="alert">{t(error)}</p><Link className="au-primary" to="/login">{t("Back to Login")}</Link></> : <p role="status">{t("Verifying your account securely…")}</p>}
  </AuthLayout>
}
