import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, FlaskConical, CircleCheck } from 'lucide-react'
import { useAuthForm } from '@auth-form'
import { useRecovery } from '../../hooks/useRecovery'
import { authLink } from '../../services/auth-links'
import { demoRecovery, recoveryService } from '../../services/authService'
import AuthLayout from '../../layouts/AuthLayout'
import PasswordInput from '../../components/auth/PasswordInput'
import PasswordStrength from '../../components/auth/PasswordStrength'
import PrimaryButton from '../../components/auth/PrimaryButton'
import FormError from '../../components/auth/FormError'
import { useAuth } from '../../hooks/useAuth'

export default function ResetPassword() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const recovery = useRecovery()
  const { user, signOut } = useAuth()
  const [error, setError] = useState('')
  const form = useAuthForm({ mode: 'reset', defaultValues: { password: '', confirmPassword: '' } })
  const permitted = recovery.flow?.stage === 'verified'
  const complete = recovery.flow?.stage === 'complete'
  const demo = recovery.flow?.mode !== 'real'
  async function submit(values) {
    setError('')
    if (!permitted) { setError('Complete the recovery preview first.'); return }
    try {
      if (demo) await demoRecovery.reset({ verified: true, expiresAt: recovery.flow.expiresAt })
      else { await recoveryService.reset(recovery.flow.requestId, recovery.flow.resetToken, values.password); if (user) await signOut() }
      form.reset(); recovery.complete()
    }
    catch (failure) { setError(failure.message) }
  }
  return <AuthLayout variant="reset" demo={demo}><Link className="au-back" to={authLink('/login', params)}><ChevronLeft size={16} />{t("Back to Login")}</Link>{complete ? <div className="au-complete" role="status"><span><CircleCheck size={38} /></span><h1>{t("You're all set.")}</h1><p>{demo ? t("The preview is complete. No real password was changed. Use your existing password when you log in.") : t("Your password has been changed. Sign in with your new password.")}</p><Link className="au-primary" to={authLink('/login', params)}>{t("Return to Login")}</Link></div> : <><div className="au-heading"><span className="au-eyebrow">{t("A FRESH START")}</span><h1>{t("Set a password")}</h1><p>{demo ? t("Choose a new password to finish this recovery preview.") : t("Choose a new password for your account.")}</p></div>{demo && <div className="au-demo-notice"><FlaskConical size={17} /><p><strong>{t("Frontend preview only")}</strong>{t("Your previous password has not been reset. This form changes no real account.")}</p></div>}{!permitted && <p className="au-mode-note">{t("Complete the ")}<Link to={authLink('/forgot-password', params)}>{t("recovery preview")}</Link>{t(" before setting a demo password.")}</p>}<form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}><PasswordInput label={t("Create Password")} placeholder={t("Create a password")} autoComplete="new-password" maxLength={128} inputProps={form.register('password')} error={form.formState.errors.password} disabled={!permitted || form.formState.isSubmitting} /><PasswordStrength value={form.watch('password')} /><PasswordInput name="confirmPassword" label={t("Confirm Password")} placeholder={t("Re-enter your password")} autoComplete="new-password" maxLength={128} inputProps={form.register('confirmPassword')} error={form.formState.errors.confirmPassword} disabled={!permitted || form.formState.isSubmitting} /><FormError message={error} /><PrimaryButton busy={form.formState.isSubmitting} busyLabel={demo ? t("Completing preview?") : t("Saving password?")} disabled={!permitted}>{t("Set Password")}</PrimaryButton></form></>}</AuthLayout>
}
