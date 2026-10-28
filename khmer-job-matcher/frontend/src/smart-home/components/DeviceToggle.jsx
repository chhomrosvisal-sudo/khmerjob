import { useI18n } from '../../i18n/useI18n'
export default function DeviceToggle({ on, onChange, label, disabled = false }) {
  const { t } = useI18n()
  return <button type="button" className={`sh-toggle ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} aria-label={t(label)} disabled={disabled} onClick={onChange}><span /></button>
}
