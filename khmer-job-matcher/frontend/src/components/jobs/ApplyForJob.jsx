import { useI18n } from '../../i18n/useI18n'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResource'
import ResourceState from '../ResourceState'

export default function ApplyForJob({ job }) {
  const { t } = useI18n()
  const { api, user } = useAuth()
  const resource = useResource(api, user?.role === 'student' ? `/api/applications?job_id=${job.id}&page_size=1` : null)
  const [submission, setSubmission] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attachResume, setAttachResume] = useState(true)
  const pending = useRef(false)
  async function apply() {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try { setSubmission(await api(`/api/applications/${job.id}`, { method: 'POST', body: { attach_resume: attachResume } })) }
    catch (failure) { setError(failure.message) }
    finally { pending.current = false; setBusy(false) }
  }
  if (!user) return <section className="card apply-panel"><h2>{t("Ready to take the next step?")}</h2><p>{t("Create a job-seeker account or sign in to apply.")}</p><Link className="primary" to={'/login?' + new URLSearchParams({ next: `/jobs/${job.id}` })}>{t("Login to apply ")}<Send size={15} /></Link></section>
  if (user.role !== 'student') return <section className="card"><p>{t("Applications are available to job-seeker accounts.")}</p></section>
  const application = submission || resource.data?.items[0]
  return <ResourceState resource={resource}><section className="card apply-panel"><h2>{application ? t("Application recorded") : t("Apply for this opportunity")}</h2><p>{job.is_demo ? t("This is a fictional demo vacancy. A demo application is recorded; no employer is contacted. Your latest resume is attached if one is uploaded.") : t("Your application is recorded in your account. Your latest uploaded resume, if any, is attached to this application and can be reviewed by this employer.")}</p>{!application && <label className="checkbox"><input type="checkbox" checked={attachResume} disabled={busy} onChange={event => setAttachResume(event.target.checked)} />{t("Attach my latest uploaded resume (optional)")}</label>}{application ? <div className="application-confirmation" role="status"><CheckCircle2 size={19} /><span>{t("Status: ")}{t(application.status)}</span><Link to="/account/applications">{t("View my applications")}</Link></div> : <button className="primary" disabled={busy} onClick={apply}><Send size={15} />{busy ? t("Submitting…") : job.is_demo ? t("Submit demo application") : t("Apply for this job")}</button>}{error && <p className="notice" role="alert">{t(error)}</p>}</section></ResourceState>
}
