import { useI18n } from '../i18n/useI18n'
import { Bookmark, MapPin, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { coverage } from '../services/coverage'
import OwnedJobActions from './jobs/OwnedJobActions'
import { salaryLabel, postedLabel } from '../services/job-display'

export default function JobCard({ job, skills, saved, toggle, canSave, pending, showCoverage, owned = false, onJobChanged }) {
  const { t, language } = useI18n()
  const result = coverage(job, skills)
  return <article className="card job-card">
    <div className="row">
      <span className="company-icon">{job.employer.name.slice(0, 1)}</span>
      {job.is_demo && <span className="badge">{t("Fictional demo listing")}</span>}
      {canSave && <button className="icon-button save" disabled={pending} aria-label={`${t(saved ? "Unsave" : "Save")} ${job.title}`} aria-pressed={saved} onClick={() => toggle(job.id)}><Bookmark fill={saved ? 'currentColor' : 'none'} size={20} /></button>}
    </div>
    <h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3><p>{job.employer.name}</p>
    <p className="metadata"><MapPin size={14} />{job.location} · {t(job.job_type)}</p>
    <div className="tags">{job.requirements.map(item => <span key={item.skill.id}>{item.skill.name}{item.required ? '' : t(" (optional)")}</span>)}</div>
    {showCoverage && <><div className="row score"><strong>{result.score}{t("% skill coverage")}</strong><span>{result.matched.length}/{job.requirements.filter(item => item.required).length}{t(" skills")}</span></div><progress value={result.score} max="100" aria-label={t("Skill coverage")} /><p>{result.missing.length ? t("To learn: {v0}", {v0: result.missing.join(', ')}) : job.requirements.some(item => item.required) ? t("You have all listed required skills.") : t("No required skills listed; score is 0%.")}</p></>}
    <p>{salaryLabel(job, language)} · {t(job.experience_level || "Experience not specified")}</p><small>{postedLabel(job.created_at, language)}</small>
    {owned && <OwnedJobActions job={job} onChanged={onJobChanged} />}
    <Link className="details" to={`/jobs/${job.id}`}>{t("View details ")}<ArrowUpRight size={16} /></Link>
  </article>
}
