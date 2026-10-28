import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAuthForm } from '@auth-form'
import { request } from '../../services/api'
import AuthLayout from '../../layouts/AuthLayout'
import FormInput from '../../components/auth/FormInput'
import PasswordInput from '../../components/auth/PasswordInput'
import PasswordStrength from '../../components/auth/PasswordStrength'
import PrimaryButton from '../../components/auth/PrimaryButton'
import FormError from '../../components/auth/FormError'

export default function EmployerRegister() {
  const { t } = useI18n()
  const { signIn, user } = useAuth(), navigate = useNavigate()
  const [error, setError] = useState(''), [created, setCreated] = useState(false)
  const form = useAuthForm({ mode: created ? 'login' : 'employer-register', defaultValues: { company: '', email: '', password: '', confirmPassword: '', terms: false } })
  async function submit(values) {
    setError('')
    try {
      if (!created) { await request('/api/auth/employer-register', { method: 'POST', body: { company: values.company.trim(), email: values.email.trim(), password: values.password } }); setCreated(true) }
      await signIn({ email: values.email.trim(), password: values.password }); navigate('/employer/company')
    } catch (failure) { setError(failure.message) }
  }
  return <AuthLayout variant="register"><div className="au-heading"><span className="au-eyebrow">{t("FIND YOUR NEXT TEAM")}</span><h1>{t("Employer sign up")}</h1><p>{t("Create your employer account. An administrator must approve it before you can publish jobs.")}</p></div>{user ? <p className="au-mode-note">{t("You are already signed in. Sign out before creating a different account. ")}<Link to="/">{t("Back to website")}</Link></p> : <form className="au-form" noValidate onSubmit={form.handleSubmit(submit)}><FormInput name="company" label={t("Company name")} inputProps={form.register('company')} maxLength={160} readOnly={created} error={form.formState.errors.company} /><FormInput name="email" label={t("Work email")} type="email" autoComplete="username" inputProps={form.register('email')} maxLength={254} readOnly={created} error={form.formState.errors.email} /><PasswordInput inputProps={form.register('password')} autoComplete="new-password" maxLength={128} error={form.formState.errors.password} /><PasswordStrength value={form.watch('password')} /><PasswordInput name="confirmPassword" label={t("Confirm Password")} inputProps={form.register('confirmPassword')} autoComplete="new-password" maxLength={128} error={form.formState.errors.confirmPassword} /><label className="au-checkbox"><input type="checkbox" {...form.register('terms')} /><span>{t("I confirm I can represent this company and understand that publishing requires approval.")}</span></label>{form.formState.errors.terms && <p className="au-field-error">{form.formState.errors.terms.message}</p>}<FormError message={error} />{created && <FormError success message="Account created. Retry sign-in if needed." />}<PrimaryButton busy={form.formState.isSubmitting}>{created ? t("Login") : t("Create employer account")}</PrimaryButton></form>}<p className="au-switch-page">{t("Have an employer account? ")}<Link to="/login?portal=employer">{t("Login")}</Link></p></AuthLayout>
}
