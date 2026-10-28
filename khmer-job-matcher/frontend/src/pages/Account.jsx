import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Bookmark, BriefcaseBusiness, FileCheck2, UserRound, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import Profile from './Profile'
import Resumes from './Resumes'
import Recommendations from './Recommendations'
import Notifications from './Notifications'

export default function Account({ profile, cardProps, onChanged }) {
  const { t, locale } = useI18n()
  const { api, user } = useAuth()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const section = location.pathname.split('/')[2]
  const applications = useResource(api, !section || section === 'applications' ? `/api/applications?page=${page}&page_size=12` : null)
  const overview = useResource(api, !section ? '/api/students/me/overview' : null)
  const showApplications = location.pathname === '/account/applications'
  const showProfile = location.pathname === '/account/profile'
  const extraPages = { resumes: <Resumes onChanged={onChanged} />, recommendations: <Recommendations cardProps={cardProps} />, notifications: <Notifications /> }
  return <div className="job-account"><div className="section-heading"><div><span className="eyebrow">{t("YOUR JOB-SEEKER ACCOUNT")}</span><h1>{showApplications ? t("My applications") : showProfile ? t("My profile") : t("Hello{v0}.", {v0: profile?.name ? `, ${profile.name}` : ''})}</h1><p>{user.email}{t(" · Job seeker")}</p></div><Link className="primary" to="/jobs">{t("Find jobs ")}<ArrowRight size={15} /></Link></div>
    <nav className="account-tabs" aria-label={t("My account")}><NavLink end to="/account"><UserRound size={16} />{t("Overview")}</NavLink><NavLink to="/account/profile"><UserRound size={16} />{t("My profile")}</NavLink><NavLink to="/account/applications"><FileCheck2 size={16} />{t("My applications")}</NavLink><NavLink to="/account/resumes">{t("Resume upload")}</NavLink><NavLink to="/account/recommendations">{t("Recommendations")}</NavLink><NavLink to="/account/notifications">{t("Notifications")}</NavLink><Link to="/settings">{t("Settings")}</Link><Link to="/jobs?saved_only=true"><Bookmark size={16} />{t("Saved jobs")}</Link></nav>
    {extraPages[section] || (showProfile ? <Profile onChanged={onChanged} /> : <ResourceState resource={applications}>{applications.data && (showApplications ? <>
      <p className="account-result-count" role="status">{applications.data.total}{t(" applications")}</p><div className="application-list">{applications.data.items.map(item => <article className="card application-card" key={item.id}><div><span className="eyebrow">{item.job.employer.name}{item.job.is_demo ? t(" · Fictional demo") : ''}</span><h2><Link to={`/jobs/${item.job.id}`}>{item.job.title}</Link></h2><p>{item.job.location} · {item.job.job_type}</p><small>{t("Applied ")}{new Date(item.created_at).toLocaleDateString(locale)}</small></div><span className="application-status">{t(item.status)}</span></article>)}</div>
      {!applications.data.items.length && <section className="card"><h2>{t("Your next opportunity is waiting")}</h2><p>{t("Applications you submit from job details will appear here.")}</p><Link to="/jobs">{t("Browse jobs")}</Link></section>}
      <div className="pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t("Previous")}</button><span>{t("Page {page} of {pages}", { page: page, pages: Math.max(1, Math.ceil(applications.data.total / 12)) })}</span><button disabled={page * 12 >= applications.data.total} onClick={() => setPage(value => value + 1)}>{t("Next")}</button></div>
    </> : <><div className="account-stat-grid"><section className="card"><FileCheck2 size={23} /><strong>{applications.data.total}</strong><span>{t("Applications")}</span><Link to="/account/applications">{t("Track your applications")}</Link></section><section className="card"><Bookmark size={23} /><strong>{cardProps.savedIds.length}</strong><span>{t("Saved jobs")}</span><Link to="/jobs?saved_only=true">{t("View saved opportunities")}</Link></section><section className="card"><BriefcaseBusiness size={23} /><strong>{profile?.skills.length || 0}</strong><span>{t("Profile skills")}</span><Link to="/account/profile">{t("Update your profile")}</Link></section></div>{overview.data && <section className="card"><div className="section-heading"><h2>{t("Profile completion")}</h2><strong>{overview.data.profile_completion}%</strong></div><progress value={overview.data.profile_completion} max="100" aria-label={t("Profile completion")} /><p>{t("Complete your name, education, interests, skills, experience, and preferred location.")}</p><h3>{t("Application status")}</h3><div className="status-bars">{Object.entries(overview.data.application_statuses).map(([status, count]) => <div key={status}><span>{t(status)}</span><progress value={count} max={overview.data.applications_count || 1} /><strong>{count}</strong></div>)}</div></section>}<section className="card account-next-step"><div><h2>{t("Make your next move.")}</h2><p>{t("Browse opportunities, review the requirements, and apply from the job details page.")}</p></div><Link className="primary" to="/jobs">{t("Explore jobs ")}<ArrowRight size={16} /></Link></section></>)}</ResourceState>)}
  </div>
}
