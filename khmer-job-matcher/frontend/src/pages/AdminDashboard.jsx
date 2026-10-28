import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { Users, Building2, BriefcaseBusiness, FileCheck2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import { downloadFile } from '../services/download'
import ModelTrainingPanel from '../components/common/ModelTrainingPanel'

export default function AdminDashboard() {
  const { t } = useI18n()
  const { api } = useAuth()
  const [tab, setTab] = useState('users')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pendingOnly, setPendingOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const overview = useResource(api, '/api/admin/overview')
  const params = new URLSearchParams({ q: query, page, page_size: 12, ...(tab === 'companies' ? { pending_only: pendingOnly } : {}) })
  const table = useResource(api, `/api/admin/${tab}?${params}`)
  async function act(path, body) {
    setBusy(true); setError(''); setMessage('')
    try { await api(path, { method: 'PATCH', body }); table.reload(); overview.reload(); setMessage('Change saved.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function addSkill(event) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form)
    setBusy(true); setError(''); setMessage('')
    try { await api('/api/admin/skills', { method: 'POST', body: { name: data.get('name').trim(), name_km: data.get('name_km').trim() || null } }); form.reset(); setMessage('Skill added to the catalog.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <div className="management-page"><div className="section-heading"><div><span className="eyebrow">{t("ADMIN WORKSPACE")}</span><h1>{t("Recruitment overview")}</h1><p>{t("Live account, employer, job, and application data.")}</p></div><div className="row"><ShieldCheck size={29} /><button disabled={busy} onClick={async () => { try { await downloadFile(api, '/api/admin/report', 'portal-report.csv') } catch (failure) { setError(failure.message) } }}>{t("Export report")}</button></div></div><ResourceState resource={overview}>{overview.data && <><div className="management-stats">{[[Users, 'Users', 'users'], [Building2, 'Employers', 'employers'], [BriefcaseBusiness, 'Job listings', 'jobs'], [FileCheck2, 'Applications', 'applications']].map(([Icon, label, key]) => <section className="card" key={key}><Icon size={23} /><strong>{overview.data[key]}</strong><span>{t(label)}</span></section>)}</div><p className="notice">{overview.data.pending_employers}{t(" employer accounts are awaiting approval.")}</p><section className="card"><h2>{t("Application statuses")}</h2><div className="status-bars">{Object.entries(overview.data.statuses).map(([status, count]) => <div key={status}><span>{t(status)}</span><progress value={count} max={overview.data.applications || 1} /><strong>{count}</strong></div>)}{!overview.data.applications && <p>{t("No applications recorded yet.")}</p>}</div></section></>}</ResourceState>
    <nav className="account-tabs" aria-label={t("Admin management")}>{['users', 'companies', 'jobs'].map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => { setTab(value); setPage(1); setQuery('') }}>{value === 'companies' ? t("Company approvals") : value === 'users' ? t("Users") : t("Jobs")}</button>)}</nav><div className="management-filters"><label>{t("Search ")}{t(tab)}<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder={tab === 'users' ? t("Email address") : t("Name or title")} /></label>{tab === 'companies' && <label className="checkbox"><input type="checkbox" checked={pendingOnly} onChange={event => { setPendingOnly(event.target.checked); setPage(1) }} />{t("Pending approvals only")}</label>}</div>{error && <p className="notice" role="alert">{t(error)}</p>}{message && <p className="notice" role="status">{t(message)}</p>}
    <ResourceState resource={table}>{table.data && <><div className="management-table"><table><thead><tr><th>{tab === 'users' ? t("Account") : tab === 'companies' ? t("Company") : 'Job'}</th><th>{t("Details")}</th><th>{t("Status")}</th><th>{t("Action")}</th></tr></thead><tbody>{table.data.items.map(item => <tr key={item.id}><td>{item.email || item.name || item.title}{item.is_demo && <small>{t("Fictional demo")}</small>}</td><td>{t(item.role) || item.company || t("ID {v0}", {v0: item.id})}</td><td>{tab === 'companies' ? item.approved ? t("Approved") : t("Pending") : item.is_active ? t("Active") : t("Disabled / closed")}</td><td>{tab === 'users' ? <button disabled={busy || item.role === 'admin'} title={item.role === 'admin' ? t("Admin accounts are managed locally") : ''} onClick={() => act(`/api/admin/users/${item.id}`, { is_active: !item.is_active })}>{item.is_active ? t("Disable account") : t("Enable account")}</button> : tab === 'companies' ? <button disabled={busy} onClick={() => act(`/api/admin/companies/${item.id}`, { approved: !item.approved })}>{item.approved ? t("Suspend publishing") : t("Approve employer")}</button> : <button disabled={busy} onClick={() => act(`/api/admin/jobs/${item.id}`, { is_active: !item.is_active })}>{item.is_active ? t("Archive listing") : t("Restore listing")}</button>}</td></tr>)}</tbody></table>{!table.data.items.length && <p className="portal-empty">{t("No records match this search.")}</p>}</div><div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Previous")}</button><span>{t("Page {page} of {pages}", { page: page, pages: Math.max(1, Math.ceil(table.data.total / 12)) })}</span><button disabled={page * 12 >= table.data.total} onClick={() => setPage(page + 1)}>{t("Next")}</button></div></>}</ResourceState>
    <ModelTrainingPanel />
    <section className="card form-card"><h2>{t("Add a catalog skill")}</h2><form onSubmit={addSkill}><label>{t("Skill name")}<input name="name" maxLength={100} required /></label><label>{t("Khmer name (optional)")}<input name="name_km" maxLength={150} /></label><button className="primary" disabled={busy}>{t("Add skill")}</button></form></section>
  </div>
}
