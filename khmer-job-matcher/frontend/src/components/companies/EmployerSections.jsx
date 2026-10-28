import { useI18n } from '../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Building2, MapPin, ArrowRight } from 'lucide-react'
import { categoryFor, initials } from '../../services/catalog'

export function EmployerLogo({ employer, index = 0 }) {
  return <span className={`employer-monogram employer-tone-${index % 5}`} aria-hidden="true">{initials(employer.name)}</span>
}

export function EmployerStrip({ employers }) {
  const { t } = useI18n()
  return <section id="employers" className="portal-section employers-section"><div className="portal-section-title"><div><span className="portal-kicker">{t("GOOD PEOPLE. GREAT POSSIBILITIES.")}</span><h2>{t("Top Employers in Cambodia")}</h2></div><a href="#featured-companies">{t("Explore employers ")}<ArrowRight size={15} /></a></div><p className="portal-section-description">{t("Explore employers with available listings. Demonstration companies are fictional.")}</p>
    <div className="employer-strip">{employers.slice(0, 8).map((employer, index) => <Link to={`/companies/${employer.id}`} key={employer.id} className="employer-strip-item"><EmployerLogo employer={employer} index={index} /><strong>{employer.name}</strong><span>{employer.count} {employer.count === 1 ? t("opportunity") : t("opportunities")} <ArrowUpRight size={12} /></span>{employer.is_demo && <small>{t("Fictional employer")}</small>}</Link>)}{!employers.length && <p className="portal-empty">{t("Employers will appear when job listings are available.")}</p>}</div>
  </section>
}

export function FeaturedSection({ jobs, employers }) {
  const { t } = useI18n()
  return <section className="featured-layout portal-section" aria-label={t("Featured opportunities")}>
    <aside className="portal-panel leading-employers"><div className="panel-title"><Building2 size={18} /><h2>{t("Leading Employers")}</h2></div><p className="panel-caption">{t("Meet your next team")}</p><div>{employers.slice(0, 5).map((employer, index) => <Link to={`/companies/${employer.id}`} key={employer.id} className="leading-item"><EmployerLogo employer={employer} index={index} /><span><strong>{employer.name}</strong><small>{employer.count}{t(" open ")}{employer.count === 1 ? t("role") : t("roles")}{employer.is_demo ? t(" · Demo") : ''}</small></span><ArrowUpRight size={14} /></Link>)}</div><a className="panel-link" href="#employers">{t("Explore employer listings ")}<ArrowRight size={14} /></a></aside>
    <div className="portal-panel featured-jobs"><div className="panel-title"><h2>{t("Featured Jobs")}</h2><span className="portal-pill">{t("Discover your next move")}</span></div><p className="panel-caption">{t("A selection from available listings")}</p>{jobs.slice(0, 3).map((job, index) => <article className="featured-job" key={job.id}><EmployerLogo employer={job.employer} index={index} /><div><span className="featured-company">{job.employer.name}{job.is_demo ? t(" · Demo") : ''}</span><h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3><p><MapPin size={12} />{job.location}<span>·</span>{t(job.job_type)}</p><span className="featured-category">{t(categoryFor(job).name)}</span></div><Link className="featured-arrow" to={`/jobs/${job.id}`} aria-label={t("View {v0}", {v0: job.title})}><ArrowUpRight size={17} /></Link></article>)}{!jobs.length && <p className="portal-empty">{t("No jobs are available yet.")}</p>}<Link className="panel-link" to="/jobs">{t("View all opportunities ")}<ArrowRight size={14} /></Link></div>
    <aside className="portal-panel featured-companies" id="featured-companies"><div className="panel-title"><h2>{t("Featured Companies")}</h2></div><p className="panel-caption">{t("Find a place to grow")}</p><div className="company-mini-grid">{employers.slice(0, 4).map((employer, index) => <Link key={employer.id} to={`/companies/${employer.id}`}><EmployerLogo employer={employer} index={index + 2} /><strong>{employer.name}</strong><small>{employer.count} {employer.count === 1 ? t("job") : t("jobs")}{employer.is_demo ? t(" · Demo") : ''}</small></Link>)}</div><Link className="company-promo" to="/register"><span>{t("READY FOR WHAT'S NEXT?")}</span><strong>{t("Your skills could open a new door.")}</strong><span>{t("Create your profile ")}<ArrowRight size={13} /></span></Link></aside>
  </section>
}
