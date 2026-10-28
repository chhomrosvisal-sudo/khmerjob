import { useI18n } from '../i18n/useI18n'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import { groupEmployers, loadCatalog } from '../services/catalog'
import HeroSearch from '../components/jobs/HeroSearch'
import { EmployerStrip, FeaturedSection } from '../components/companies/EmployerSections'
import PortalJobCard from '../components/jobs/PortalJobCard'
import CategoryGrid from '../components/jobs/CategoryGrid'
import CareerAdvice from '../components/common/CareerAdvice'
import PortalSkeleton from '../components/common/PortalSkeleton'

export default function Home({ cardProps, revision }) {
  const { t } = useI18n()
  const { api } = useAuth()
  const catalogApi = useCallback((path, options) => loadCatalog(api, {}, options), [api])
  const resource = useResource(catalogApi, 'homepage-catalog', revision)
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const jobs = [...(resource.data || [])].sort((a, b) => b.id - a.id)
  const employers = groupEmployers(jobs)
  const filtered = jobs.filter(job => !type || job.job_type === type)
  const pages = Math.max(1, Math.ceil(filtered.length / 6))
  const currentPage = Math.min(page, pages)
  return <div className="portal-home"><HeroSearch />
    <div className="portal-container">
      {resource.loading && <PortalSkeleton />}
      {resource.error && <section className="portal-error" role="alert"><h2>{t("We could not load opportunities")}</h2><p>{resource.error}</p><button onClick={resource.reload}>{t("Try again")}</button></section>}
      {!resource.loading && !resource.error && <>
        <EmployerStrip employers={employers} />
        <FeaturedSection jobs={jobs} employers={employers} />
        <section className="portal-section latest-section" id="latest-jobs"><div className="portal-section-title"><div><span className="portal-kicker">{t("YOUR NEXT OPPORTUNITY IS OUT THERE")}</span><h2>{t("Latest Job Opportunities")}</h2></div><Link to="/jobs">{t("View all jobs ")}<ArrowRight size={15} /></Link></div><div className="latest-toolbar"><p>{filtered.length}{t(" opportunities to explore ")}<span>{t("Demo listings are labeled")}</span></p><label><SlidersHorizontal size={14} /><span className="sr-only">{t("Filter opportunities by employment type")}</span><select value={type} onChange={event => { setType(event.target.value); setPage(1) }}><option value="">{t("All employment types")}</option>{['Full-time', 'Part-time', 'Internship', 'Contract'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label></div>
          <div className="portal-jobs-grid">{filtered.slice((currentPage - 1) * 6, currentPage * 6).map((job, index) => <PortalJobCard key={job.id} job={job} cardProps={cardProps} index={index} />)}</div>
          {!filtered.length && <div className="portal-empty"><h3>{t("No opportunities in this view yet")}</h3><p>{t("Try a different employment type or check back for new listings.")}</p>{type && <button onClick={() => setType('')}>{t("Clear filter")}</button>}</div>}
          <div className="portal-pagination"><button aria-label={t("Previous job page")} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>{t("Page {page} of {pages}", { page: currentPage, pages: pages })}</span><button aria-label={t("Next job page")} disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div>
        </section><CategoryGrid jobs={jobs} />
      </>}
      <CareerAdvice />
    </div>
  </div>
}
