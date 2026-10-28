import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Building2, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import JobCard from '../components/JobCard'

export function Companies() {
  const { t } = useI18n()
  const { api } = useAuth()
  const [q, setQ] = useState(''), [page, setPage] = useState(1)
  const resource = useResource(api, '/api/companies?' + new URLSearchParams({ q, page, page_size: 12 }))
  return <section><div className="section-heading"><div><span className="eyebrow">{t("FIND YOUR NEXT TEAM")}</span><h1>{t("Companies in Cambodia")}</h1><p>{t("Discover approved employers and their opportunities. Fictional employers are labeled.")}</p></div><Building2 size={30} /></div><label className="card">{t("Search companies")}<input type="search" value={q} onChange={event => { setQ(event.target.value); setPage(1) }} placeholder={t("Company name")} /></label><ResourceState resource={resource}>{resource.data && <><div className="job-grid">{resource.data.items.map(item => <article className="card" key={item.id}><span className="eyebrow">{item.is_demo ? t("FICTIONAL DEMO COMPANY") : t("EMPLOYER")}</span><h2>{item.name}</h2><p>{item.location || t("Location not provided")}</p><p>{item.job_count}{t(" open jobs")}</p><Link to={`/companies/${item.id}`}>{t("Company profile ")}<ArrowRight size={14} /></Link></article>)}</div>{!resource.data.items.length && <p className="card">{t("No companies match your search.")}</p>}<div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Previous")}</button><span>{t("Page {page} of {pages}", { page: page, pages: Math.max(1, Math.ceil(resource.data.total / 12)) })}</span><button disabled={page * 12 >= resource.data.total} onClick={() => setPage(page + 1)}>{t("Next")}</button></div></>}</ResourceState></section>
}

export function CompanyProfile({ cardProps }) {
  const { t } = useI18n()
  const { id } = useParams(), { api } = useAuth()
  const company = useResource(api, `/api/companies/${id}`)
  const jobs = useResource(api, `/api/jobs?company_id=${id}&page_size=100`)
  return <section><Link to="/companies">{t("Back to companies")}</Link><ResourceState resource={company}>{company.data && <section className="card"><span className="eyebrow">{company.data.is_demo ? t("FICTIONAL DEMO COMPANY") : t("EMPLOYER PROFILE")}</span><h1>{company.data.name}</h1><p>{company.data.location}</p><p className="description">{company.data.description || t("This employer has not added a description yet.")}</p>{/^https?:\/\//.test(company.data.website) && <a href={company.data.website} target="_blank" rel="noopener noreferrer">{t("Visit company website")}</a>}</section>}</ResourceState><div className="section-heading"><h2>{t("Open opportunities")}</h2><Link to={`/jobs?company_id=${id}`}>{t("View all company jobs")}</Link></div><ResourceState resource={jobs}>{jobs.data && <div className="job-grid">{jobs.data.items.map(job => <JobCard key={job.id} job={job} {...cardProps} saved={cardProps.savedIds.includes(job.id)} pending={cardProps.pendingIds.includes(job.id) || cardProps.savedLoading} />)}{!jobs.data.items.length && <p className="card">{t("No open jobs at this company.")}</p>}</div>}</ResourceState></section>
}
