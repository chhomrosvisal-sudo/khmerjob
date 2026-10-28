import { useI18n } from '../../i18n/useI18n'
import LoadingSpinner from './LoadingSpinner'
export default function PrimaryButton({ children, busy, busyLabel = 'Please wait…', disabled = false, ...props }) {
  const { t } = useI18n()
  return <button type="submit" className="au-primary" {...props} disabled={busy || disabled} aria-busy={busy}>{busy && <LoadingSpinner />}{busy ? t(busyLabel) : children}</button>
}
