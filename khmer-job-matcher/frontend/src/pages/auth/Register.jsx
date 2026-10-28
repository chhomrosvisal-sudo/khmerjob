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
import SocialLoginButtons from '../../components/auth/SocialLoginButtons'
import FormError from '../../components/auth/FormError'
import PolicyDialog from '../../components/auth/PolicyDialog'
import AuthToast from '../../components/auth/AuthToast'

export default function Register() {
  const { t } = useI18n()
  const { user, signIn } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const demo = params.get('demo') === '1'
  const destination = postLoginPath(user, params.get('next'))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [created, setCreated] = useState(false)
  const [policy, setPolicy] = useState(null)
  const form = useAuthForm({ mode: created ? 'login' : 'register', defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', terms: false } })
  const { errors, isSubmitting } = form.formState
  if (user && !demo) return <Navigate to={destination} replace />
  async function submit(values) {
    setError(''); setSuccess('')
    try {
      if (demo) { setSuccess('Demo form validated. No real account was created.'); form.reset(); return }
      if (!created) { await authService.register(values); setCreated(true) }
      const account = await signIn({ email: values.email.trim(), password: values.password })
      navigate(postLoginPath(account, params.get('next')), { replace: true })
    } catch (failure) { setError(failure.message || 'We could not create your account. Please try again.') }
  }
  return <AuthLayout variant="register" demo={demo}><div className="au-heading"><span className="au-eyebrow">{t("YOUR JOB-SEEKER ACCOUNT")}</span><h1>{t("Sign up")}</h1><p>{t("Create your account to find jobs, save opportunities, and track your applications.")}</p></div>
    {demo && <p className="au-mode-note">{t("Frontend demo · no account will be created.")}</p>}
    {created && <FormError success message="Account created. If sign-in failed, retry here or use the Login page." />}
    <form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}>
      <div className="au-field-row"><FormInput name="firstName" label={t("First Name")} placeholder={t("Sokha")} autoComplete="given-name" maxLength={40} inputProps={form.register('firstName')} error={errors.firstName} disabled={isSubmitting} readOnly={created} /><FormInput name="lastName" label={t("Last Name")} placeholder={t("Chan")} autoComplete="family-name" maxLength={40} inputProps={form.register('lastName')} error={errors.lastName} disabled={isSubmitting} readOnly={created} /></div>
      <div className="au-field-row"><FormInput name="email" label={t("Email")} type="email" placeholder={t("you@example.com")} autoComplete="email" maxLength={254} inputProps={form.register('email')} error={errors.email} disabled={isSubmitting} readOnly={created} /><FormInput name="phone" label={t("Phone Number")} type="tel" placeholder="+855" autoComplete="tel" maxLength={24} inputProps={form.register('phone')} error={errors.phone} disabled={isSubmitting} readOnly={created} /></div>
      <p className="au-small-note">{t("Phone is optional and is not saved by the current account service.")}</p>
      <PasswordInput placeholder={t("Create a password")} autoComplete="new-password" maxLength={128} inputProps={form.register('password')} error={errors.password} disabled={isSubmitting} /><PasswordStrength value={form.watch('password')} />
      <PasswordInput name="confirmPassword" label={t("Confirm Password")} placeholder={t("Re-enter your password")} autoComplete="new-password" maxLength={128} inputProps={form.register('confirmPassword')} error={errors.confirmPassword} disabled={isSubmitting} />
      <div><label className="au-checkbox"><input type="checkbox" {...form.register('terms')} /><span>{t("I agree to the ")}<button type="button" onClick={() => setPolicy('terms')}>{t("Terms")}</button>{t(" and ")}<button type="button" onClick={() => setPolicy('privacy')}>{t("Privacy Policy")}</button>.</span></label>{errors.terms && <p className="au-field-error">{errors.terms.message}</p>}</div>
      <FormError message={error} /><PrimaryButton busy={isSubmitting} busyLabel={created ? t("Logging in…") : t("Creating account…")}>{created ? t("Login to your account") : t("Create Account")}</PrimaryButton>
    </form><p className="au-switch-page">{t("Already have an account? ")}<Link to={authLink('/login', params)}>{t("Login")}</Link></p><SocialLoginButtons register /><AuthToast message={success} onDismiss={() => setSuccess('')} />{policy && <PolicyDialog policy={policy} onClose={() => setPolicy(null)} />}
  </AuthLayout>
}
