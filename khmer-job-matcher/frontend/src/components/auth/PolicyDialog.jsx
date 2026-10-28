import { useI18n } from '../../i18n/useI18n'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function PolicyDialog({ policy, onClose }) {
  const { t } = useI18n()
  const ref = useRef(null)
  useEffect(() => { const dialog = ref.current; if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); return () => { if (typeof dialog.close === 'function' && dialog.open) dialog.close() } }, [])
  return <dialog ref={ref} className="au-policy-dialog" aria-label={policy === 'terms' ? t("Terms preview") : t("Privacy notice")} onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose() }}><div><h2>{policy === 'terms' ? t("Terms preview") : t("Privacy notice")}</h2><button type="button" aria-label={t("Close notice")} onClick={onClose}><X size={19} /></button></div>{policy === 'terms' ? <p>{t("This is a development version of KhmerJob. Demo jobs and companies are fictional. Use accurate account information and do not upload sensitive personal documents. Job applications are not available yet. This preview notice must be replaced with the final service terms before a public launch.")}</p> : <p>{t("Real account and profile details are stored by the local FastAPI/MySQL service. The server hashes passwords. Access tokens stay in memory; “Remember me” stores only your email in this browser. Phone numbers on this form are not saved by the current account service. Recovery previews do not send email, create authentication tokens, or change real passwords.")}</p>}</dialog>
}
