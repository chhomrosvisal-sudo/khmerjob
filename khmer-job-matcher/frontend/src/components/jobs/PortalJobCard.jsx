import { useI18n } from '../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { Bookmark, MapPin, Banknote, ArrowUpRight, BriefcaseBusiness, GraduationCap } from 'lucide-react'
import { EmployerLogo } from '../companies/EmployerSections'
import { categoryFor } from '../../services/catalog'
import { salaryLabel, postedLabel } from '../../services/job-display'

export default function PortalJobCard({ job, cardProps, index = 0 }) {
  const { t, language } = useI18n()
  const saved = cardProps.savedIds.includes(job.id)
  const pending = cardProps.savedLoading || cardProps.pendingIds.includes(job.id)
  return <article className="portal-job-card"><div className="portal-job-top"><EmployerLogo employer={job.employer} index={index} /><span className="portal-job-type">{t(job.job_type)}</span>{cardProps.canSave ? <button className="portal-save" aria-label={`${t(saved ? "Unsave" : "Save")} ${job.title}`} aria-pressed={saved} disabled={pending} onClick={() => cardProps.toggle(job.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button> : <Link className="portal-save" to="/login" aria-label={t("Sign in to save {v0}", {v0: job.title})}><Bookmark size={18} /></Link>}</div>
    <p className="portal-job-company">{job.employer.name}{job.is_demo && <span>{t("Demo")}</span>}</p><h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
    <div className="portal-job-meta"><span><MapPin size={14} />{job.location}</span><span><Banknote size={14} />{salaryLabel(job, language)}</span><span><BriefcaseBusiness size={14} />{t(categoryFor(job).name)}</span><span><GraduationCap size={14} />{t(job.experience_level || "Experience not specified")}</span></div>
    <div className="portal-job-skills">{job.requirements.slice(0, 4).map(item => <span key={item.skill.id}>{item.skill.name}</span>)}{job.requirements.length > 4 && <span>+{job.requirements.length - 4}</span>}{!job.requirements.length && <span>{t("No skills specified")}</span>}</div>
    <div className="portal-job-bottom"><span>{postedLabel(job.created_at, language)}</span><Link to={`/jobs/${job.id}`}>{t("View job ")}<ArrowUpRight size={14} /></Link></div>
  </article>
}
