import { useI18n } from '../i18n/useI18n'
import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, BookOpen, Target, Bookmark, Compass, Check, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import JobCard from '../components/JobCard'
import { coverage } from '../services/coverage'

export default function Dashboard({ cardProps, revision, profile, matcher = false }) {
  const { t } = useI18n()
  const { api, user } = useAuth()
  const resource = useResource(api, user?.role === 'student' ? '/api/students/me/overview' : null, revision)
  if (user?.role !== 'student') return <section className="welcome"><div><span className="eyebrow">{t("YOUR WORKSPACE")}</span><h1>{user?.role === 'employer' ? t("Your employer dashboard") : t("Your administrator dashboard")}</h1><p>{user?.role === 'employer' ? t("Create opportunities and manage your job listings.") : t("Manage accounts and the skill catalog through the API documentation.")}</p>{user?.role === 'employer' ? <Link className="primary" to="/employer/jobs">{t("Manage your jobs ")}<ArrowRight size={16} /></Link> : <a className="primary" href={`${(import.meta.env.VITE_API_BASE_URL || '/').replace(/\/$/, '')}/docs`}>{t("Open API documentation")}</a>}</div><CareerIllustration /></section>
  return <><section className="welcome"><div><span className="eyebrow">{t("YOUR FUTURE, ONE STEP CLOSER")}</span><h1>{matcher ? t("Turn skills into possibilities") : t("Welcome back{v0}", {v0: profile ? `, ${profile.name}` : ''})}</h1><p>{t("Discover opportunities based on your account’s skills.")}</p><Link className="primary" to={matcher ? '/profile' : '/jobs'}>{matcher ? t("Edit your skills") : t("Explore opportunities")} <ArrowRight size={16} /></Link></div><CareerIllustration /></section>
    <ResourceState resource={resource}>{resource.data && <>
      {!matcher && <div className="stats">{[[BriefcaseBusiness, 'Jobs with matching skills', resource.data.matched_jobs_count], [BookOpen, 'Your skills', resource.data.skills_count], [Target, 'Highest skill coverage', `${resource.data.highest_coverage}%`], [Bookmark, 'Saved jobs', resource.data.saved_count]].map(([Icon, label, value]) => <section className="card stat" key={label}><span className="stat-icon"><Icon size={21} /></span><p>{t(label)}</p><strong>{t(value)}</strong><small>{t("Your career at a glance")}</small></section>)}</div>}
      <section className="card"><h2>{matcher ? t("Your skills") : t("How recommendations work")}</h2>{matcher && <div className="tags">{profile?.skills.map(skill => <span key={skill.id}>{skill.name}</span>)}</div>}<p>{t("Required-skill coverage = matched required skills ÷ all required skills × 100. No requirements gives 0%. Optional skills do not affect the score. This comparison is not a hiring probability.")}</p></section>
      <div className="section-heading"><h2>{t("Recommended for you")}</h2><Link to="/jobs">{t("View all jobs →")}</Link></div>
      {!resource.data.recommended.length && <section className="card"><p>{t("No opportunities are available yet.")}</p></section>}
      <div className="job-grid">{resource.data.recommended.map(job => <JobCard key={job.id} job={job} {...cardProps} saved={cardProps.savedIds.includes(job.id)} pending={cardProps.pendingIds.includes(job.id) || cardProps.savedLoading} />)}</div>
      {matcher && profile && <section className="card"><h2>{t("Suggested learning topics")}</h2><p>{[...new Set(resource.data.recommended.flatMap(job => coverage(job, profile.skills).missing))].join(' · ') || t("No missing skills among these recommendations.")}</p></section>}
    </>}</ResourceState></>
}

export function CareerIllustration() {
  const { t } = useI18n()
  return <div className="career-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-spark"><Sparkles size={22} /></div><div className="career-preview"><span className="preview-label">{t("YOUR NEXT CHAPTER")}</span><span className="preview-icon"><Compass size={35} strokeWidth={1.4} /></span><h3>{t("Made for your potential.")}</h3><p>{t("Skills today. Possibilities tomorrow.")}</p><div className="preview-tags"><span>{t("Discover")}</span><span>{t("Learn")}</span><span>{t("Grow")}</span></div></div><div className="art-note"><span><Check size={15} /></span>{t(" One step closer to your future")}</div></div>
}
