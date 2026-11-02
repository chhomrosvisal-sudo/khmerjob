import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResource'
import { useI18n } from '../../i18n/useI18n'
import ResourceState from '../ResourceState'
import { downloadFile } from '../../services/download'

export default function DashboardAnalytics({ revision }) {
  const { api } = useAuth()
  const { t, locale } = useI18n()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const params = new URLSearchParams({ ...(start ? { start } : {}), ...(end ? { end } : {}) })
  const resource = useResource(api, `/api/admin/dashboard?${params}`, revision)
  async function exportData() {
    setExporting(true); setError('')
    try { await downloadFile(api, `/api/admin/dashboard/export?${params}`, 'dashboard-report.csv') }
    catch (failure) { setError(failure.message) }
    finally { setExporting(false) }
  }
  return <section aria-label={t('Dashboard analytics')}>
    <div className="admin-analytics-filters">
      <label>{t('Start date')}<input type="date" value={start} max={end || undefined} onChange={event => setStart(event.target.value)} /></label>
      <label>{t('End date')}<input type="date" value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} /></label>
      <button onClick={() => { setStart(''); setEnd('') }}>{t('Reset')}</button>
      <button onClick={resource.reload}>{t('Refresh')}</button>
      <button disabled={exporting || resource.loading || Boolean(resource.error)} onClick={exportData}>{t(exporting ? 'Downloading...' : 'Export dashboard CSV')}</button>
    </div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <ResourceState resource={resource}>{resource.data && <>
      <p>{resource.data.start} — {resource.data.end}</p>
      <div className="admin-metrics">{[
        ['Students', 'students'], ['Employers', 'employers'], ['Approved companies', 'verified_companies'],
        ['Active jobs', 'active_jobs'], ['Applications', 'applications'], ['AI job matches', 'ai_matches'],
        ['Pending employer approvals', 'pending_employers'], ['Pending job approvals', 'pending_jobs'],
      ].map(([label, key]) => <section className="admin-metric" key={key}><span>{t(label)}</span><strong>{resource.data[key] === null ? '—' : new Intl.NumberFormat(locale).format(resource.data[key])}</strong>{resource.data[key] === null && <small>{t('Not recorded yet')}</small>}</section>)}</div>
      <div className="admin-overview-grid">{[
        ['Monthly student registrations', 'student_registrations', 'month'],
        ['Monthly job postings', 'job_postings', 'month'],
        ['Application status', 'application_statuses', 'name'],
        ['Top 10 in-demand skills', 'top_skills', 'name'],
      ].map(([title, key, axis]) => <section className="admin-panel" key={key}><div className="admin-panel-heading"><h2>{t(title)}</h2></div>
        {resource.data[key].some(row => row.count > 0) ? <>
          <div style={{ width: '100%', height: 260 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={resource.data[key]} accessibilityLayer><XAxis dataKey={axis} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <details><summary>{t('View data')}</summary><table className="admin-table"><tbody>{resource.data[key].map(row => <tr key={row[axis]}><th>{row[axis]}</th><td>{row.count}</td></tr>)}</tbody></table></details>
        </> : <p className="admin-empty">{t('No records in this date range.')}</p>}
      </section>)}</div>
      <section className="admin-panel"><div className="admin-panel-heading"><h2>{t('Recent platform activities')}</h2></div>{resource.data.activities.length ? <ul>{resource.data.activities.map(item => <li key={`${item.label}-${item.record_id}`}><Link to={item.path}>{t(item.label)} #{item.record_id}</Link> · <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(locale)}</time></li>)}</ul> : <p className="admin-empty">{t('No records in this date range.')}</p>}</section>
      <details className="admin-panel"><summary>{t('How these metrics are calculated')}</summary><ul>{resource.data.notes.map(note => <li key={note}>{t(note)}</li>)}</ul></details>
    </>}</ResourceState>
  </section>
}
