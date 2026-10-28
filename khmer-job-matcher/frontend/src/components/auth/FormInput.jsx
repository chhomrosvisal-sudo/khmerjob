import { useI18n } from '../../i18n/useI18n'
export default function FormInput({ label, name, error, hint, inputProps, ...props }) {
  const { t } = useI18n()
  const id = `au-${name}`
  return <div className="au-field"><label htmlFor={id}>{t(label)}</label><input id={id} {...inputProps} {...props} aria-invalid={Boolean(error)} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} />{hint && <small id={`${id}-hint`}>{t(hint)}</small>}{error && <p className="au-field-error" id={`${id}-error`}>{t(error.message || error)}</p>}</div>
}
