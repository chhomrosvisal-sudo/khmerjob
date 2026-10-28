import { useI18n } from '../../i18n/useI18n'
import { CircleCheck, X } from 'lucide-react'
export default function AuthToast({ message, onDismiss }) {
  const { t } = useI18n()
  if (!message) return null
  return <aside className="au-toast" role="status"><CircleCheck size={20} /><p>{t(message)}</p><button type="button" onClick={onDismiss} aria-label={t("Dismiss success message")}><X size={16} /></button></aside>
}
