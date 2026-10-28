import { passwordStrength } from '../../services/auth-validation'
import { useI18n } from '../../i18n/useI18n'
export default function PasswordStrength({ value }) {
  const { t } = useI18n()
  const strength = passwordStrength(value)
  return <div className="au-strength"><div aria-hidden="true">{[1, 2, 3, 4].map(step => <span key={step} style={{ background: step <= strength.score ? strength.color : '#e9edf5' }} />)}</div><p aria-live="polite">{t(strength.label)}</p></div>
}
