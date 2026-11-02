import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Users, Building2, BriefcaseBusiness, FileCheck2, ArrowUpRight, ArrowRight, Download, RefreshCw, ShieldCheck, CheckCircle2, Clock3, Search, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n/useI18n'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import { downloadFile } from '../services/download'
import ModelTrainingPanel from '../components/common/ModelTrainingPanel'
import '../admin.css'
import Notifications from './Notifications'
import AdminApplications from '../components/admin/AdminApplications'
import DashboardAnalytics from '../components/admin/DashboardAnalytics'
import ConfirmDialog from '../components/admin/ConfirmDialog'

const views = {
  overview: ['Recruitment overview', 'A clear view of your recruitment community.'],
  users: ['User management', 'Manage account access across your platform.'],
  companies: ['Company approvals', 'Review employers and manage their publishing access.'],
  jobs: ['Job moderation', 'Keep opportunities relevant and your job board up to date.'],
  matching: ['AI Job Matching', 'Manage and refresh the recommendation model.'],
  students: ['Students', 'Manage student and job-seeker account access.'],
  employers: ['Employers', 'Review company profiles and publishing access.'],
  approvals: ['Approvals', 'Review employers waiting for publishing approval.'],
  skills: ['Skills Management', 'Maintain the shared skills catalog.'],
  applications: ['Applications', 'Review real applications across the platform.'],
  reports: ['Reports', 'Review platform totals and download a CSV summary.'],
  notifications: ['Notifications', 'Read and manage notifications for your account.'],
}
const metrics = [
  [Users, 'Students', 'students', 'Registered job-seeker accounts', '/dashboard/students'],
  [Building2, 'Employers', 'employers', 'Companies on the platform', '/dashboard/employers'],
  [BriefcaseBusiness, 'Job listings', 'jobs', 'All listings, including closed', '/dashboard/jobs'],
  [FileCheck2, 'Applications', 'applications', 'Applications across all jobs', '/dashboard/applications'],
]
const statuses = ['submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected']

export default function AdminDashboard() {
  const { t, locale } = useI18n()
  const { api } = useAuth()
  const location = useLocation()
  const requestedView = location.pathname.split('/')[2] || 'overview'
  const selectedView = Object.hasOwn(views, requestedView) ? requestedView : 'overview'
  const view = selectedView === 'students' ? 'users' : ['employers', 'approvals'].includes(selectedView) ? 'companies' : selectedView
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pendingOnly, setPendingOnly] = useState(() => selectedView === 'approvals' || new URLSearchParams(location.search).get('pending') === '1')
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [modelRevision, setModelRevision] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const overview = useResource(api, '/api/admin/overview')
  const isTable = ['users', 'companies', 'jobs'].includes(view)
  const params = new URLSearchParams({ q: query, page, page_size: 12, ...(selectedView === 'students' ? { role: 'student' } : {}), ...(view === 'companies' ? { pending_only: pendingOnly } : {}) })
  const table = useResource(api, isTable ? `/api/admin/${view}?${params}` : null)
  const approvals = useResource(api, view === 'overview' ? '/api/admin/companies?pending_only=true&page_size=4' : null)
  const [title, description] = views[selectedView]
  const number = value => new Intl.NumberFormat(locale).format(value)
  async function act(path, body) {
    setBusy(true); setError(''); setMessage('')
    try { await api(path, { method: 'PATCH', body }); table.reload(); approvals.reload(); overview.reload(); setMessage('Change saved.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false); setPendingAction(null) }
  }
  async function exportReport() {
    setExporting(true); setError('')
    try { await downloadFile(api, '/api/admin/report', 'portal-report.csv'); setMessage('Report downloaded.') }
    catch (failure) { setError(failure.message) } finally { setExporting(false) }
  }
  async function addSkill(event) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form)
    setBusy(true); setError(''); setMessage('')
    try { await api('/api/admin/skills', { method: 'POST', body: { name: data.get('name').trim(), name_km: data.get('name_km').trim() || null } }); form.reset(); setModelRevision(value => value + 1); setMessage('Skill added to the catalog.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  if (!Object.hasOwn(views, requestedView)) return <section className="card"><h1>{t('Page not found')}</h1><Link to="/dashboard">{t('Return to dashboard')}</Link></section>
  return <div className="admin-dashboard">
    <ConfirmDialog action={pendingAction} busy={busy} onCancel={() => setPendingAction(null)} onConfirm={() => act(pendingAction.path, pendingAction.body)} />
    <div className="admin-breadcrumb">{t('Workspace')}<span>/</span>{t(title)}</div>
    <div className="admin-page-heading"><div><span className="eyebrow">{t('ADMIN WORKSPACE')}</span><h1>{t(title)}</h1><p>{t(description)}</p></div><div className="admin-heading-actions"><button aria-label={t('Refresh dashboard')} onClick={() => { overview.reload(); table.reload(); approvals.reload(); setModelRevision(value => value + 1) }}><RefreshCw size={16} /></button><button className="primary" disabled={exporting} onClick={exportReport}><Download size={16} />{t(exporting ? 'Downloading...' : 'Export report')}</button></div></div>
    {error && <p className="notice error" role="alert">{t(error)}</p>}{message && <p className="notice" role="status">{t(message)}</p>}
    {view === 'overview' && <>
      <DashboardAnalytics revision={modelRevision} />
      <ResourceState resource={overview}>{overview.data && <>
        <div className="admin-metrics">{metrics.map(([Icon, label, key, detail, href], index) => <section className="admin-metric" key={key}><div className="admin-metric-top"><span className={`admin-metric-icon tone-${index}`}><Icon size={20} /></span>{href && <Link to={href} aria-label={t(label)}><ArrowUpRight size={18} /></Link>}</div><span>{t(label)}</span><strong>{number(overview.data[key])}</strong><small>{t(detail)}</small></section>)}</div>
        <div className="admin-approval-banner"><span className="admin-banner-icon"><ShieldCheck size={25} /></span><div><h2>{t('Your community, in good hands.')}</h2><p>{t('{count} employers are waiting for your review.', { count: number(overview.data.pending_employers) })}</p></div><Link to="/dashboard/approvals">{t('Review employers')}<ArrowRight size={16} /></Link></div>
        <div className="admin-overview-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>{t('Application pipeline')}</h2><p>{t('Where applications stand right now')}</p></div><span className="admin-pill">{number(overview.data.applications)} {t('total')}</span></div><div className="admin-pipeline">{[...new Set([...statuses, ...Object.keys(overview.data.statuses)])].map((status, index) => { const count = overview.data.statuses[status] || 0; return <div className="admin-pipeline-row" key={status}><span><i className={`pipeline-dot tone-${index % 4}`} />{t(status)}</span><progress aria-label={t(status)} value={count} max={overview.data.applications || 1} /><strong>{number(count)}</strong></div> })}</div>{!overview.data.applications && <p className="admin-empty-note">{t('No applications recorded yet.')}</p>}<div className="admin-panel-foot"><FileCheck2 size={15} />{t('Counts reflect the current application status.')}</div></section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{t('Quick actions')}</h2><p>{t('Keep your platform moving')}</p></div><Sparkles size={20} /></div><div className="admin-quick-actions">{[[Users, 'Manage students', 'Review account access', 'students'], [Building2, 'Review employers', 'Approve employer publishing', 'employers'], [BriefcaseBusiness, 'Manage job listings', 'Review and moderate vacancies', 'jobs'], [Sparkles, 'AI Job Matching', 'Maintain your recommendation tools', 'matching']].map(([Icon, label, detail, target]) => <Link to={'/dashboard/' + target} key={target}><span className="admin-action-icon"><Icon size={18} /></span><span><strong>{t(label)}</strong><small>{t(detail)}</small></span><ArrowUpRight size={16} /></Link>)}</div></section></div>
      </>}</ResourceState>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{t('Employer review queue')}</h2><p>{t('New companies need approval before publishing jobs.')}</p></div><Link to="/dashboard/approvals">{t('View all')}<ArrowRight size={15} /></Link></div><ResourceState resource={approvals}>{approvals.data && <>{approvals.data.items.length ? <div className="admin-review-list">{approvals.data.items.map(item => <div key={item.id}><span className="admin-company-avatar">{item.name.slice(0, 2).toUpperCase()}</span><span><strong>{item.name}</strong><small>{item.is_demo ? t('Fictional demo') : t('Employer')}</small></span><span className="admin-pill pending"><Clock3 size={12} />{t('Pending')}</span><button disabled={busy} onClick={() => setPendingAction({ path: `/api/admin/companies/${item.id}`, body: { approved: true }, label: item.name })}><CheckCircle2 size={15} />{t('Approve employer')}</button></div>)}</div> : <div className="admin-empty"><CheckCircle2 size={30} /><h3>{t('All caught up')}</h3><p>{t('No employer accounts are waiting for approval.')}</p></div>}</>}</ResourceState></section>
    </>}
    {isTable && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{t(title)}</h2><p>{table.data ? t('{count} records', { count: number(table.data.total) }) : t('Live platform records')}</p></div><span className="admin-pill"><ShieldCheck size={13} />{t('Admin access')}</span></div><div className="admin-table-filters"><label><span className="sr-only">{t('Search')}</span><Search size={17} /><input type="search" maxLength={160} value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder={view === 'users' ? t('Email address') : t('Name or title')} /></label>{view === 'companies' && <label className="admin-checkbox"><input type="checkbox" disabled={selectedView === 'approvals'} checked={pendingOnly} onChange={event => { setPendingOnly(event.target.checked); setPage(1) }} />{t('Pending approvals only')}</label>}</div><ResourceState resource={table}>{table.data && <><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>{t(view === 'users' ? 'Account' : view === 'companies' ? 'Company' : 'Job')}</th><th>{t('Details')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead><tbody>{table.data.items.map(item => { const active = view === 'companies' ? item.approved : item.is_active; return <tr key={item.id}><td><strong>{item.email || item.name || item.title}</strong>{item.is_demo && <small>{t('Fictional demo')}</small>}</td><td>{item.role ? t(item.role) : item.company || t('ID {v0}', { v0: item.id })}</td><td><span className={`admin-pill ${active ? 'approved' : 'pending'}`}>{t(view === 'companies' ? active ? 'Approved' : 'Pending' : active ? 'Active' : 'Disabled / closed')}</span></td><td><button disabled={busy || (view === 'users' && item.role === 'admin')} title={item.role === 'admin' ? t('Admin accounts are managed locally') : undefined} onClick={() => setPendingAction({ path: `/api/admin/${view}/${item.id}`, body: view === 'companies' ? { approved: !item.approved } : { is_active: !item.is_active }, label: item.email || item.name || item.title })}>{t(view === 'users' ? active ? 'Disable account' : 'Enable account' : view === 'companies' ? active ? 'Suspend publishing' : 'Approve employer' : active ? 'Archive listing' : 'Restore listing')}</button></td></tr> })}</tbody></table>{!table.data.items.length && <div className="admin-empty"><Search size={26} /><h3>{t('No records match this search.')}</h3></div>}</div><div className="admin-table-pagination"><span>{t('Page {page} of {pages}', { page, pages: Math.max(1, Math.ceil(table.data.total / 12)) })}</span><div><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t('Previous')}</button><button disabled={page * 12 >= table.data.total} onClick={() => setPage(page + 1)}>{t('Next')}</button></div></div></>}</ResourceState></section>}
    {view === 'applications' && <AdminApplications revision={modelRevision} />}
    {view === 'matching' && <ModelTrainingPanel key={modelRevision} />}
    {view === 'notifications' && <Notifications key={modelRevision} />}
    {view === 'reports' && <ResourceState resource={overview}>{overview.data && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{t('Platform summary')}</h2><p>{t('Current totals across the recruitment platform.')}</p></div></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>{t('Metric')}</th><th>{t('Count')}</th></tr></thead><tbody>{[['Users', 'users'], ['Employers', 'employers'], ['Job Listings', 'jobs'], ['Applications', 'applications'], ['Pending approvals', 'pending_employers']].map(([label, key]) => <tr key={key}><td>{t(label)}</td><td>{number(overview.data[key])}</td></tr>)}</tbody></table></div><div className="admin-panel-foot">{t('Use Export report to download this summary and application status counts.')}</div></section>}</ResourceState>}
    {view === 'skills' && <><SkillCatalog key={modelRevision} /><section className="admin-panel admin-skill-form"><div className="admin-panel-heading"><div><h2>{t('Add a catalog skill')}</h2><p>{t('Help job seekers and employers describe their skills consistently.')}</p></div><Sparkles size={22} /></div><form onSubmit={addSkill}><label>{t('Skill name')}<input name="name" maxLength={100} required /></label><label>{t('Khmer name (optional)')}<input name="name_km" maxLength={150} /></label><button className="primary" disabled={busy}>{t('Add skill')}</button></form></section></>}
  </div>
}

function SkillCatalog() {
  const { api } = useAuth()
  const { t } = useI18n()
  const skills = useResource(api, '/api/skills')
  const [query, setQuery] = useState('')
  const filtered = (skills.data || []).filter(skill => `${skill.name} ${skill.name_km || ''}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="admin-panel"><div className="admin-panel-heading"><h2>{t('Skill catalog')}</h2></div><div className="admin-table-filters"><label><Search size={17} /><input type="search" aria-label={t('Search skills')} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Search skills')} /></label></div><ResourceState resource={skills}><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>{t('Skill name')}</th><th>{t('Khmer name (optional)')}</th></tr></thead><tbody>{filtered.map(skill => <tr key={skill.id}><td>{skill.name}</td><td>{skill.name_km || '-'}</td></tr>)}</tbody></table>{!filtered.length && <p className="admin-empty">{t('No records match this search.')}</p>}</div></ResourceState></section>
}
