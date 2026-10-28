import { useI18n } from '../../i18n/useI18n'
import { useRef } from 'react'
import { editOtp } from '../../services/auth-validation'

export default function OTPInput({ value, onChange, disabled, error }) {
  const { t } = useI18n()
  const inputs = useRef([])
  const digits = Array.from({ length: 6 }, (_, index) => /^\d$/.test(value[index] || '') ? value[index] : '')
  function update(index, text) {
    const cleaned = text.replace(/\D/g, '')
    onChange(editOtp(value, index, text))
    if (!cleaned) return
    inputs.current[Math.min(index + cleaned.length, 5)]?.focus()
  }
  return <div className="au-otp-group"><label id="otp-label">{t("Verification code")}</label><div role="group" aria-labelledby="otp-label" className="au-otp">{digits.map((digit, index) => <input key={index} ref={node => { inputs.current[index] = node }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete={index === 0 ? 'one-time-code' : 'off'} value={digit} disabled={disabled} aria-label={t("Code digit {v0}", {v0: index + 1})} aria-invalid={Boolean(error)} aria-describedby={error ? 'otp-error' : undefined} onFocus={event => event.target.select()} onChange={event => update(index, event.target.value)} onPaste={event => { event.preventDefault(); update(index, event.clipboardData.getData('text')) }} onKeyDown={event => {
    if (event.key === 'Backspace' && !digit && index > 0) { event.preventDefault(); update(index - 1, ''); inputs.current[index - 1]?.focus() }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); inputs.current[index - 1]?.focus() }
    if (event.key === 'ArrowRight' && index < 5) { event.preventDefault(); inputs.current[index + 1]?.focus() }
  }} />)}</div>{error && <p id="otp-error" className="au-field-error">{t(error.message || error)}</p>}</div>
}
