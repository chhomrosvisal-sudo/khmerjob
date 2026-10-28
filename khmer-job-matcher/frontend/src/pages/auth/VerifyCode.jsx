import { useI18n } from '../../i18n/useI18n'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, FlaskConical, RotateCw } from 'lucide-react'
import { useAuthForm } from '@auth-form'
import { useRecovery } from '../../hooks/useRecovery'
import { demoRecovery, recoveryService, DEMO_CODE } from '../../services/authService'
import { authLink } from '../../services/auth-links'
import { maskEmail } from '../../services/auth-validation'
import AuthLayout from '../../layouts/AuthLayout'
import OTPInput from '../../components/auth/OTPInput'
import PrimaryButton from '../../components/auth/PrimaryButton'
import FormError from '../../components/auth/FormError'
import AuthToast from '../../components/auth/AuthToast'

export default function VerifyCode() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const recovery = useRecovery()
  const { flow } = recovery
  const demo = flow?.mode !== 'real'
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [message, setMessage] = useState(location.state?.recoveryMessage || '')
  const [resending, setResending] = useState(false)
  const form = useAuthForm({ mode: 'verify', defaultValues: { code: '' } })
  useEffect(() => { if (!flow) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [flow])
  const remaining = flow ? Math.max(0, Math.ceil((flow.resendAt - now) / 1000)) : 0
  const active = flow?.stage === 'requested'
  async function submit(values) {
    setError(''); setMessage('')
    if (!active) { setError('Start a recovery preview first.'); return }
    try {
      if (demo) { await demoRecovery.verify({ code: values.code, expiresAt: flow.expiresAt }); recovery.verify() }
      else { const result = await recoveryService.verify(flow.requestId, values.code); recovery.verify(result.reset_token) }
      navigate(authLink('/reset-password', params))
    }
    catch (failure) { setError(failure.message) }
  }
  async function resend() {
    if (!active || resending || Date.now() < flow.resendAt) return
    setResending(true); setError('')
    try {
      if (demo) { await demoRecovery.request(); recovery.begin(flow.email); setMessage('New demo code prepared. No email was sent.') }
      else { const result = await recoveryService.request(flow.email); recovery.begin(flow.email, { mode: 'real', requestId: result.request_id, resendSeconds: result.resend_seconds }); setMessage(result.message) }
      setNow(Date.now()); form.setValue('code', '')
    }
    catch (failure) { setError(failure.message) }
    finally { setResending(false) }
  }
  return <AuthLayout variant="verify" demo={demo}><Link className="au-back" to={authLink('/forgot-password', params)}><ChevronLeft size={16} />{t("Back")}</Link><div className="au-heading"><span className="au-eyebrow">{t("ONE SMALL CHECK")}</span><h1>{t("Verify code")}</h1><p>{t("Enter the six-digit ")}{demo ? t("demo code") : t("code from your email")}{t(" for ")}{flow ? maskEmail(flow.email) : t("your recovery preview")}.</p></div>{demo && <div className="au-demo-notice"><FlaskConical size={17} /><p><strong>{t("Demo code: ")}{DEMO_CODE}</strong>{t("This public preview code grants no account access. No email was sent.")}</p></div>}{!active && <p className="au-mode-note">{t("Start a new ")}<Link to={authLink('/forgot-password', params)}>{t("recovery preview")}</Link>{t(" before verifying a code.")}</p>}<form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}><OTPInput value={form.watch('code')} onChange={value => form.setValue('code', value, { shouldValidate: true })} disabled={!active || form.formState.isSubmitting || resending} error={form.formState.errors.code} /><FormError message={error} /><PrimaryButton busy={form.formState.isSubmitting} busyLabel={t("Verifying…")} disabled={!active || resending}>{t("Verify")}</PrimaryButton></form><div className="au-resend"><span>{t("Didn't receive a code?")}</span><button type="button" disabled={!active || remaining > 0 || resending || form.formState.isSubmitting} onClick={resend}><RotateCw size={13} />{resending ? t("Preparing…") : remaining > 0 ? t("Resend in {v0}s", {v0: remaining}) : t("Resend Code")}</button></div><p className="au-small-note">{demo ? t("Demo codes expire after 5 minutes.") : t("Recovery codes expire after 10 minutes.")}{t(" Refreshing requires a new recovery request.")}</p><AuthToast message={message} onDismiss={() => setMessage('')} /></AuthLayout>
}
