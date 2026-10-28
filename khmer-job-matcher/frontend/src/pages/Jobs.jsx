import { useI18n } from '../i18n/useI18n'
import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import { queryString } from '../services/api'
import JobCard from '../components/JobCard'
import ResourceState from '../components/ResourceState'
import { categories, categoryFor, loadCatalog } from '../services/catalog'
import ApplyForJob from '../components/jobs/ApplyForJob'

export function Jobs({ cardProps, revision, owned = false }) {
  const { t } = useI18n()
  const { api, user } = useAuth()
  const [params, setParams] = useSearchParams()
  const category = categories.some(item => item.id === params.get('category')) ? params.get('category') : ''
  const filters = { q: params.get('q') || '', location: params.get('location') || '', job_type: params.get('job_type') || '', saved_only: params.get('saved_only') === 'true' }
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)
  const path = '/api/jobs?' + queryString({ ...filters, owned_only: owned, company_id: params.get('company_id') || '', page, page_size: 12, category })
  const categoryApi = useCallback(async (requestPath, options) => {
    const values = Object.fromEntries(new URLSearchParams(requestPath.split('?')[1]))
    const { category: selectedCategory, page: requestedPage, page_size: pageSize, ...apiFilters } = values
    const all = await loadCatalog(api, apiFilters, options)
    const filtered = all.filter(job => categoryFor(job).id === selectedCategory)
    const start = (Number(requestedPage) - 1) * Number(pageSize)
    return { items: filtered.slice(start, start + Number(pageSize)), total: filtered.length }
  }, [api])
  const resource = useResource(category ? categoryApi : api, path, revision)
  function filter(key, value) { setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, String(value)); else next.delete(key); next.delete('page'); return next }) }
  function setPage(value) { setParams(current => { const next = new URLSearchParams(current); next.set('page', String(value)); return next }) }
  return <><div className="section-heading"><h1>{owned ? t("Manage your opportunities") : t("Find your next opportunity")}</h1>{owned && <Link className="primary" to="/employer/jobs/new">{t("Post a job")}</Link>}</div>
    <section className="card filters"><label>{t("Search jobs")}<input type="search" value={filters.q} placeholder={t("Job title or company")} onChange={e => filter('q', e.target.value)} /></label><label>{t("Job function")}<select value={category} onChange={e => filter('category', e.target.value)}><option value="">{t("All job functions")}</option>{categories.map(item => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label><label>{t("Location")}<input value={filters.location} placeholder={t("e.g. Phnom Penh")} onChange={e => filter('location', e.target.value)} /></label><label>{t("Job type")}<select value={filters.job_type} onChange={e => filter('job_type', e.target.value)}><option value="">{t("All types")}</option>{['Full-time', 'Part-time', 'Internship', 'Contract'].map(type => <option key={type} value={type}>{t(type)}</option>)}</select></label>{user?.role === 'student' && <label className="checkbox"><input type="checkbox" checked={filters.saved_only} onChange={e => filter('saved_only', e.target.checked)} />{t("Saved only")}</label>}</section>
    {category && <p className="portal-filter-note">{t("Job function suggestions are based on job titles and skills.")}</p>}
    <ResourceState resource={resource}>{resource.data && <><p role="status">{resource.data.total}{t(" opportunities")}</p><div className="job-grid">{resource.data.items.map(job => <JobCard key={job.id} job={job} {...cardProps} saved={cardProps.savedIds.includes(job.id)} pending={cardProps.pendingIds.includes(job.id) || cardProps.savedLoading} owned={owned} onJobChanged={resource.reload} />)}</div>
      {!resource.data.items.length && <section className="card"><h2>{t("No jobs found")}</h2><p>{t("Try another search or clear your filters.")}</p><button onClick={() => setParams({})}>{t("Clear filters")}</button></section>}
      <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Previous")}</button><span>{t("Page {page} of {pages}", { page: page, pages: Math.max(1, Math.ceil(resource.data.total / 12)) })}</span><button disabled={page * 12 >= resource.data.total} onClick={() => setPage(page + 1)}>{t("Next")}</button></div></>}</ResourceState></>
}

export function JobDetails({ cardProps, revision }) {
  const { t } = useI18n()
  const { id } = useParams()
  const { api, user } = useAuth()
  const resource = useResource(api, `/api/jobs/${id}`, revision)
  return <><Link to="/jobs">{t("← Back to jobs")}</Link><ResourceState resource={resource}>{resource.data && <><JobCard job={resource.data} {...cardProps} saved={cardProps.savedIds.includes(resource.data.id)} pending={cardProps.pendingIds.includes(resource.data.id) || cardProps.savedLoading} /><ApplyForJob key={resource.data.id} job={resource.data} /><section className="card"><h2>{t("About this opportunity")}</h2><p className="description">{resource.data.description}</p><h3>{t("Skill requirements")}</h3><ul>{resource.data.requirements.map(item => <li key={item.skill.id}>{item.skill.name} · {t(item.proficiency)} · {item.required ? t("required") : t("optional")}</li>)}</ul>{!user && <Link to="/login">{t("Sign in as a student to save this job")}</Link>}</section></>}</ResourceState></>
}
