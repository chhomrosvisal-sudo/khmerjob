import { notificationText } from '../i18n/notifications.js'
import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'

export default function Notifications() {
  const { t, locale, language } = useI18n()
  const { api } = useAuth()
  const resource = useResource(api, '/api/notifications')
  const [error, setError] = useState('')
  async function read(id) { try { await api(`/api/notifications/${id}/read`, { method: 'POST' }); resource.reload() } catch (failure) { setError(failure.message) } }
  return <section><div className="section-heading"><h2>{t("Notifications")}</h2><button onClick={resource.reload}>{t("Refresh updates")}</button></div>{error && <p role="alert">{t(error)}</p>}<ResourceState resource={resource}>{resource.data && <>{!resource.data.length && <p className="card">{t("No notifications yet. Application updates will appear here.")}</p>}{resource.data.map(item => <article className="card" key={item.id}><p>{notificationText(item.message, language)}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small>{!item.is_read && <button onClick={() => read(item.id)}>{t("Mark as read")}</button>}</article>)}</>}</ResourceState></section>
}
