import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function OwnedJobActions({ job, onChanged }) {
  const { t } = useI18n()
  const { api } = useAuth()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function toggle() {
    setBusy(true); setError('')
    try { await api(`/api/jobs/${job.id}/state`, { method: 'PATCH', body: { is_active: !job.is_active } }); onChanged?.() }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <div className="owned-job-actions"><Link to={`/employer/jobs/${job.id}/edit`}>{t("Edit listing")}</Link><button disabled={busy} onClick={toggle}>{busy ? t("Saving…") : job.is_active ? t("Close listing") : t("Reopen listing")}</button><span>{job.is_active ? t("Open") : t("Closed")}</span>{error && <p role="alert">{t(error)}</p>}</div>
}
