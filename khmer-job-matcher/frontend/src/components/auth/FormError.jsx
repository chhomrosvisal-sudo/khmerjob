import { useI18n } from '../../i18n/useI18n'
import { CircleAlert, CircleCheck } from 'lucide-react'
export default function FormError({ message, success = false }) {
  const { t } = useI18n()
  if (!message) return null
  return <div className={`au-feedback ${success ? 'is-success' : ''}`} role={success ? 'status' : 'alert'}>{success ? <CircleCheck size={17} /> : <CircleAlert size={17} />}<span>{t(message)}</span></div>
}
