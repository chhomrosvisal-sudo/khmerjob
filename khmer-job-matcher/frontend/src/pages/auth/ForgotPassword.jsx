import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, FlaskConical } from 'lucide-react'
import { useAuthForm } from '@auth-form'
import { useRecovery } from '../../hooks/useRecovery'
import { demoRecovery, recoveryService } from '../../services/authService'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResource'
import { authLink } from '../../services/auth-links'
import AuthLayout from '../../layouts/AuthLayout'
import FormInput from '../../components/auth/FormInput'
import PrimaryButton from '../../components/auth/PrimaryButton'
import FormError from '../../components/auth/FormError'
import SocialLoginButtons from '../../components/auth/SocialLoginButtons'

export default function ForgotPassword() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const recovery = useRecovery()
  const { api } = useAuth()
  const capabilities = useResource(api, '/api/auth/recovery-capabilities')
  const demo = params.get('demo') === '1'
  const available = demo || capabilities.data?.enabled
  const [error, setError] = useState('')
  const form = useAuthForm({ mode: 'forgot', defaultValues: { email: '' } })
  async function submit(values) {
    setError('')
    try {
      if (demo) {
        await demoRecovery.request(); recovery.begin(values.email.trim())
        navigate(authLink('/verify-code', params), { state: { recoveryMessage: 'Demo request accepted. No email was sent, and no account lookup was performed.' } })
      } else {
        const result = await recoveryService.request(values.email.trim())
        recovery.begin(values.email.trim(), { mode: 'real', requestId: result.request_id, resendSeconds: result.resend_seconds })
        navigate(authLink('/verify-code', params), { state: { recoveryMessage: result.message } })
      }
    } catch (failure) { setError(failure.message) }
  }
  return <AuthLayout variant="forgot" demo={demo}><Link className="au-back" to={authLink('/login', params)}><ChevronLeft size={16} />{t("Back to Login")}</Link><div className="au-heading"><span className="au-eyebrow">{t("LET'S GET YOU BACK IN")}</span><h1>{t("Forgot your password?")}</h1><p>{t("Don't worry, happens to all of us. Enter your email below to recover access to your account.")}</p></div>{demo ? <div className="au-demo-notice"><FlaskConical size={17} /><p><strong>{t("Recovery demo")}</strong>{t("No email is sent. Your real password will stay unchanged.")}</p></div> : !capabilities.loading && !capabilities.data?.enabled ? <div className="au-mode-note">{capabilities.error || t("Email recovery is not configured yet. Contact the site operator.")}<br /><Link to={authLink('/forgot-password', new URLSearchParams({ ...Object.fromEntries(params), demo: '1' }))}>{t("Try the labeled recovery demo")}</Link></div> : <p className="au-small-note">{t("If an active account exists, instructions will be requested. Codes expire after 10 minutes.")}</p>}<form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}><FormInput name="email" label={t("Email")} type="email" placeholder={t("you@example.com")} autoComplete="email" maxLength={254} inputProps={form.register('email')} error={form.formState.errors.email} disabled={form.formState.isSubmitting} /><FormError message={error} /><PrimaryButton busy={form.formState.isSubmitting} busyLabel={demo ? t("Preparing preview?") : t("Requesting recovery?")} disabled={!available}>{t("Continue")}</PrimaryButton></form><SocialLoginButtons /></AuthLayout>
}
