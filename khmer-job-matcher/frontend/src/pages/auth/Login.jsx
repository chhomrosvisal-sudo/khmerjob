import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import NeonAuthLayout from '../../layouts/NeonAuthLayout'
import { useAuth } from '../../hooks/useAuth'
import { useAuthForm } from '@auth-form'
import { postLoginPath } from '../../services/auth-navigation'
import { authLink } from '../../services/auth-links'
import FormInput from '../../components/auth/FormInput'
import PasswordInput from '../../components/auth/PasswordInput'
import PrimaryButton from '../../components/auth/PrimaryButton'
import SocialLoginButtons from '../../components/auth/SocialLoginButtons'
import FormError from '../../components/auth/FormError'
import AuthToast from '../../components/auth/AuthToast'

function rememberedEmail() { try { return localStorage.getItem('kjm-remembered-email') || '' } catch { return '' } }

export default function Login() {
  const { t } = useI18n()
  const { user, signIn } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const demo = params.get('demo') === '1'
  const employer = params.get('portal') === 'employer'
  const destination = postLoginPath(user, params.get('next'))
  const [remembered] = useState(rememberedEmail)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const form = useAuthForm({ mode: 'login', defaultValues: { email: remembered, password: '', remember: Boolean(remembered) } })
  const { errors, isSubmitting } = form.formState
  if (user && !demo) return <Navigate to={destination} replace />
  async function submit(values) {
    setError(''); setSuccess('')
    try {
      if (demo) { setSuccess('Demo form validated. No session was created. Use real sign-in to access the dashboard.'); return }
      const account = await signIn({ email: values.email.trim(), password: values.password })
      try { if (values.remember) localStorage.setItem('kjm-remembered-email', values.email.trim()); else localStorage.removeItem('kjm-remembered-email') } catch { /* Sign-in does not require browser storage. */ }
      navigate(postLoginPath(account, params.get('next')), { replace: true })
    } catch (failure) { setError(failure.message || 'We could not sign you in. Please try again.') }
  }
  const registerPath = employer ? '/employer-register' : authLink('/register', params)

  return <NeonAuthLayout
    title={employer ? t("Employer login") : t("Login")}
    alternate={<Link to={registerPath}>{employer ? t("Create an employer account") : t("Sign Up")}</Link>}
    feedback={<AuthToast message={success} onDismiss={() => setSuccess('')} />}
  >
        {location.state?.registered && <FormError success message={t("Account created. Log in to find a job.")} />}
        {demo && <p className="au-mode-note">{t("Frontend demo · no real sign-in or dashboard access.")}</p>}
        <form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}>
          <FormInput name="email" label={t("Email")} type="email" placeholder={t("you@example.com")} autoComplete="username" maxLength={254} inputProps={form.register('email')} error={errors.email} disabled={isSubmitting} />
          <PasswordInput placeholder={t("Enter your password")} autoComplete="current-password" maxLength={128} inputProps={form.register('password')} error={errors.password} disabled={isSubmitting} />
          <div className="au-form-options"><label className="au-checkbox"><input type="checkbox" {...form.register('remember')} /><span>{t("Remember me")}</span></label><Link to={authLink('/forgot-password', params)}>{t("Forgot Password?")}</Link></div>
          <p className="au-small-note">{t("Remember me saves your email. You stay signed in until you sign out or your session expires.")}</p><FormError message={error} />
          <PrimaryButton busy={isSubmitting} busyLabel={t("Logging in…")}>{t("Login")} <ArrowRight size={17} aria-hidden="true" /></PrimaryButton>
        </form>
        {employer && <p className="au-switch-page"><Link to={authLink('/register', params)}>{t("Sign Up")}</Link></p>}
        <SocialLoginButtons />
  </NeonAuthLayout>
}
