import { useEffect, useId, useRef } from 'react'
import { useI18n } from '../../i18n/useI18n'

export default function ConfirmDialog({ action, busy, onCancel, onConfirm }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    if (!action) return
    const previousFocus = document.activeElement
    const dialog = ref.current
    if (dialog.showModal) dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      dialog.close?.()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [action])
  if (!action) return null
  return <dialog ref={ref} className="admin-confirm-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}>
    <h2 id={titleId}>{t('Confirm administrative action')}</h2>
    <p>{t('This changes account access or job visibility. Confirm that you want to continue.')}</p>
    <p><strong>{action.label}</strong></p>
    <div className="admin-heading-actions"><button autoFocus disabled={busy} onClick={onCancel}>{t('Cancel')}</button><button className="primary" disabled={busy} onClick={onConfirm}>{t(busy ? 'Saving…' : 'Confirm')}</button></div>
  </dialog>
}
