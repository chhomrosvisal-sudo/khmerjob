import { useI18n } from '../../i18n/useI18n'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children }) {
  const { t } = useI18n()
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])
  return <dialog ref={ref} className="sh-modal" aria-label={t(title)} onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose() }}><div className="sh-modal-title"><h2>{t(title)}</h2><button type="button" className="sh-icon-button" aria-label={t("Close dialog")} onClick={onClose}><X size={20} /></button></div>{children}</dialog>
}
