import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import { downloadFile } from '../services/download'
import ResourceState from '../components/ResourceState'

function CompanyForm({ company, api, reload }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setMessage('')
    try { await api('/api/employer/company', { method: 'PATCH', body: Object.fromEntries(['name', 'description', 'location', 'website'].map(key => [key, form.get(key).trim()])) }); reload(); setMessage('Company profile saved.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <section className="card form-card"><h2>{t("Company profile")}</h2><p>{company.approved ? t("Approved to publish jobs.") : t("Awaiting administrator approval. You can complete your profile while you wait.")}</p><form onSubmit={submit}><label>{t("Company name")}<input name="name" defaultValue={company.name} required maxLength={160} /></label><label>{t("About your company")}<textarea name="description" defaultValue={company.description} maxLength={4000} /></label><label>{t("Location")}<input name="location" defaultValue={company.location} maxLength={100} /></label><label>{t("Website")}<input name="website" type="url" defaultValue={company.website} maxLength={250} placeholder={t("https://")} /></label><button className="primary" disabled={busy}>{busy ? t("Saving…") : t("Save company")}</button></form>{message && <p role="status">{t(message)}</p>}{error && <p role="alert">{t(error)}</p>}</section>
}

export default function EmployerDashboard() {
  const { t } = useI18n()
  const { api } = useAuth(), location = useLocation()
  const company = useResource(api, '/api/employer/company')
  const analytics = useResource(api, '/api/employer/analytics')
  const [page, setPage] = useState(1), [query, setQuery] = useState(''), [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const applications = useResource(api, '/api/employer/applications?' + new URLSearchParams({ page, page_size: 12, q: query, status }))
  async function change(id, value) {
    if (!value) return
    setBusy(true); setError('')
    try { await api(`/api/employer/applications/${id}`, { method: 'PATCH', body: { status: value } }); applications.reload(); analytics.reload() }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function resume(id) { setError(''); try { await downloadFile(api, `/api/employer/applications/${id}/resume`, 'applicant-resume') } catch (failure) { setError(failure.message) } }
  return <section className="management-page"><div className="section-heading"><h1>{t("Employer workspace")}</h1><Link className="primary" to="/employer/jobs">{t("Manage jobs")}</Link></div><nav className="account-tabs"><Link to="/employer/applications">{t("Applications")}</Link><Link to="/employer/company">{t("Company profile")}</Link><Link to="/employer/analytics">{t("Analytics")}</Link></nav><ResourceState resource={company}>{company.data && !company.data.approved && <p className="notice">{t("Your employer account is pending approval. Publishing is disabled until an administrator approves it.")}</p>}</ResourceState>{error && <p role="alert" className="notice">{t(error)}</p>}
    {location.pathname.endsWith('/company') ? <ResourceState resource={company}>{company.data && <CompanyForm company={company.data} api={api} reload={company.reload} />}</ResourceState> : location.pathname.endsWith('/analytics') ? <ResourceState resource={analytics}>{analytics.data && <><div className="management-stats">{[['jobs', 'Total listings'], ['active_jobs', 'Open listings'], ['applications', 'Applications']].map(([key, label]) => <section className="card" key={key}><strong>{analytics.data[key]}</strong><span>{t(label)}</span></section>)}</div><section className="card"><h2>{t("Application pipeline")}</h2><div className="status-bars">{Object.entries(analytics.data.statuses).map(([name, count]) => <div key={name}><span>{name}</span><progress value={count} max={analytics.data.applications || 1} /><strong>{count}</strong></div>)}{!analytics.data.applications && <p>{t("No applicants yet.")}</p>}</div></section></>}</ResourceState> : <><div className="management-filters"><label>{t("Search applicants")}<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label><label>{t("Status")}<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">{t("All statuses")}</option>{['submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label></div><ResourceState resource={applications}>{applications.data && <>{applications.data.items.map(item => <article className="card applicant-card" key={item.id}><div><span className="eyebrow">{item.job_title}</span><h2>{item.applicant.name}</h2><p>{item.applicant.email}</p><p>{item.applicant.education}</p><p className="description">{item.applicant.experience}</p><strong className="application-status">{t(item.status)}</strong></div><div className="applicant-actions">{item.has_resume && <button onClick={() => resume(item.id)}>{t("Download attached resume")}</button>}<label>{t("Update application")}<select value="" disabled={busy || !item.next_statuses.length} onChange={event => change(item.id, event.target.value)}><option value="">{item.next_statuses.length ? t("Choose next status") : t("Final status")}</option>{item.next_statuses.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label></div></article>)}{!applications.data.items.length && <p className="card">{t("No applications match these filters.")}</p>}<div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Previous")}</button><span>{t("Page {page} of {pages}", { page: page, pages: Math.max(1, Math.ceil(applications.data.total / 12)) })}</span><button disabled={page * 12 >= applications.data.total} onClick={() => setPage(page + 1)}>{t("Next")}</button></div></>}</ResourceState></>}
  </section>
}
