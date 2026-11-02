import { notificationText } from '../i18n/notifications.js'
import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function Notifications() {
  const { t, locale, language } = useI18n()
  const { api } = useAuth()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const resource = useResource(api, '/api/notifications?' + new URLSearchParams({ unread_only: unreadOnly, page, page_size: 20 }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function read(id) {
    setBusy(true); setError('')
    try {
      await api(id == null ? '/api/notifications/read-all' : `/api/notifications/${id}/read`, { method: 'POST' })
      setPage(1); resource.reload()
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <section>
    <div className="section-heading notification-heading"><h2>{t('Notifications')}</h2><div className="row"><button onClick={resource.reload}>{t('Refresh updates')}</button><button disabled={busy || resource.loading || Boolean(resource.error)} onClick={() => read(null)}>{t('Mark all as read')}</button></div></div>
    <label className="checkbox"><input type="checkbox" checked={unreadOnly} onChange={event => { setUnreadOnly(event.target.checked); setPage(1) }} />{t('Unread only')}</label>
    {error && <p role="alert">{t(error)}</p>}
    <ResourceState resource={resource}>{resource.data && <>
      {!resource.data.length && <p className="card">{t('No notifications yet. Application updates will appear here.')}</p>}
      {resource.data.map(item => <article className="card" key={item.id}><p>{notificationText(item.message, language)}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small>{!item.is_read && <button disabled={busy} onClick={() => read(item.id)}>{t('Mark as read')}</button>}</article>)}
      <div className="pagination"><button disabled={busy || page === 1} onClick={() => setPage(page - 1)}>{t('Previous')}</button><span>{t('Page {page}', { page })}</span><button disabled={busy || resource.data.length < 20} onClick={() => setPage(page + 1)}>{t('Next')}</button></div>
    </>}</ResourceState>
  </section>
}
