import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({ label = 'Password', name = 'password', error, inputProps, ...props }) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const id = `au-${name}`
  return <div className="au-field"><label htmlFor={id}>{t(label)}</label><div className="au-password-wrap"><input id={id} type={visible ? 'text' : 'password'} {...inputProps} {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? t("Hide password") : t("Show password")} aria-pressed={visible}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <p className="au-field-error" id={`${id}-error`}>{t(error.message || error)}</p>}</div>
}
