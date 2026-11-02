import { useState } from 'react'
import { FileCheck2, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResource'
import { useI18n } from '../../i18n/useI18n'
import ResourceState from '../ResourceState'

const statuses = ['submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected']

export default function AdminApplications({ revision = 0 }) {
  const { api } = useAuth()
  const { t, locale } = useI18n()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ q: query, page, page_size: 12 })
  if (status) params.set('status', status)
  const resource = useResource(api, `/api/admin/applications?${params}`, revision)

  return <section className="admin-panel">
    <div className="admin-panel-heading">
      <div>
        <h2>{t('Applications')}</h2>
        <p>{t('Review applications across all employers. Employers manage hiring decisions.')}</p>
      </div>
      <FileCheck2 size={20} aria-hidden="true" />
    </div>
    <div className="admin-table-filters">
      <label>
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{t('Search applications')}</span>
        <input type="search" maxLength={160} value={query}
          placeholder={t('Applicant, email, job, or company')}
          onChange={event => { setQuery(event.target.value); setPage(1) }} />
      </label>
      <label className="admin-status-filter">
        <span>{t('Application status')}</span>
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
          <option value="">{t('All statuses')}</option>
          {statuses.map(value => <option key={value} value={value}>{t(value)}</option>)}
        </select>
      </label>
    </div>
    <ResourceState resource={resource}>
      {resource.data && <>
        <div className="admin-table-scroll" role="region" aria-label={t('Application records')} tabIndex={0}>
          <table className="admin-table">
            <caption className="sr-only">{t('Applications across all employers')}</caption>
            <thead><tr>
              {['Applicant', 'Job', 'Company', 'Status', 'Applied'].map(label => <th scope="col" key={label}>{t(label)}</th>)}
            </tr></thead>
            <tbody>{resource.data.items.map(item => <tr key={item.id}>
              <td><strong>{item.applicant_name || item.applicant_email}</strong><small>{item.applicant_email}</small></td>
              <td><strong>{item.job_title}</strong>{item.is_demo && <small>{t('Fictional demo')}</small>}</td>
              <td>{item.company_name}</td>
              <td><span className={`admin-pill ${item.status === 'accepted' ? 'approved' : ''}`}>{t(item.status)}</span></td>
              <td><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(locale)}</time></td>
            </tr>)}</tbody>
          </table>
          {!resource.data.items.length && <div className="admin-empty">
            <FileCheck2 size={28} aria-hidden="true" />
            <h3>{t(query || status ? 'No applications match these filters.' : 'No applications recorded yet.')}</h3>
            {(query || status) && <button onClick={() => { setQuery(''); setStatus(''); setPage(1) }}>{t('Clear filters')}</button>}
          </div>}
        </div>
        <div className="admin-table-pagination">
          <span aria-live="polite">{t('Page {page} of {pages}', { page, pages: Math.max(1, Math.ceil(resource.data.total / 12)) })}</span>
          <div>
            <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t('Previous')}</button>
            <button disabled={page * 12 >= resource.data.total} onClick={() => setPage(value => value + 1)}>{t('Next')}</button>
          </div>
        </div>
      </>}
    </ResourceState>
  </section>
}
