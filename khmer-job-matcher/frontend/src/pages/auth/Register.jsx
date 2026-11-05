import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthForm } from '@auth-form'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/authService'
import { postLoginPath } from '../../services/auth-navigation'
import { authLink } from '../../services/auth-links'
import AuthLayout from '../../layouts/AuthLayout'
import FormInput from '../../components/auth/FormInput'
import PasswordInput from '../../components/auth/PasswordInput'
import PasswordStrength from '../../components/auth/PasswordStrength'
import PrimaryButton from '../../components/auth/PrimaryButton'
import FormError from '../../components/auth/FormError'
import AuthToast from '../../components/auth/AuthToast'

export default function Register() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const demo = params.get('demo') === '1'
  const destination = postLoginPath(user, params.get('next'))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const form = useAuthForm({ mode: 'register', defaultValues: { name: '', email: '', password: '', confirmPassword: '' } })
  const { errors, isSubmitting } = form.formState
  if (user && !demo) return <Navigate to={destination} replace />
  async function submit(values) {
    setError(''); setSuccess('')
    try {
      if (demo) { setSuccess('Demo form validated. No real account was created.'); form.reset(); return }
      await authService.register(values)
      navigate(authLink('/login', params), { replace: true, state: { registered: true } })
    } catch (failure) { setError(failure.message || 'We could not create your account. Please try again.') }
  }
  return <AuthLayout variant="register" demo={demo} footer={<><Link className="au-register-back" to="/">← {t("Back")}</Link><span className="au-register-signin">{t("Have an account?")} <Link to={authLink('/login', params)}>{t("Sign in")}</Link></span></>}><div className="au-heading"><h1>{t("Create your account")}</h1></div>
    {demo && <p className="au-mode-note">{t("Frontend demo · no account will be created.")}</p>}
    <form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}>
      <FormInput name="name" label={t("Name")} autoComplete="name" maxLength={80} inputProps={form.register('name')} error={errors.name} disabled={isSubmitting} />
      <FormInput name="email" label={t("Email")} type="email" autoComplete="email" maxLength={254} inputProps={form.register('email')} error={errors.email} disabled={isSubmitting} />
      <PasswordInput placeholder={t("Use at least 12 characters")} autoComplete="new-password" maxLength={128} inputProps={form.register('password')} error={errors.password} disabled={isSubmitting} /><PasswordStrength value={form.watch('password')} />
      <PasswordInput name="confirmPassword" label={t("Confirm Password")} placeholder="" autoComplete="new-password" maxLength={128} inputProps={form.register('confirmPassword')} error={errors.confirmPassword} disabled={isSubmitting} />
      <FormError message={error} /><PrimaryButton busy={isSubmitting} busyLabel={t("Creating account…")}>{t("Create Account")}</PrimaryButton>
    </form><AuthToast message={success} onDismiss={() => setSuccess('')} />
  </AuthLayout>
}
