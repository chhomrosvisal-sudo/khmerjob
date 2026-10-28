import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import { categories } from '../services/catalog'

function EditorForm({ job, catalog, onChanged }) {
  const { t } = useI18n()
  const { api } = useAuth()
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState((job?.requirements || []).map(item => ({ skill_id: item.skill.id, required: item.required, proficiency: item.proficiency })))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)
  function update(skillId, patch) { setRequirements(current => current.map(item => item.skill_id === skillId ? { ...item, ...patch } : item)) }
  async function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const body = { title: data.get('title').trim(), description: data.get('description').trim(), location: data.get('location').trim(), job_type: data.get('job_type'), category: data.get('category'), experience_level: data.get('experience_level').trim() || 'Not specified', salary_min: data.get('salary_min') === '' ? null : Number(data.get('salary_min')), salary_max: data.get('salary_max') === '' ? null : Number(data.get('salary_max')), requirements }
    if (!body.title || !body.description || !body.location) { setError('Title, description, and location cannot be blank.'); return }
    setBusy(true); setError('')
    try {
      await api(job ? `/api/jobs/${job.id}` : '/api/jobs', { method: job ? 'PATCH' : 'POST', body })
      setCompleted(true); onChanged(); navigate('/employer/jobs', { state: { message: job ? 'Job updated.' : 'Job published.' } })
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit}><fieldset className="form-fields" disabled={busy || completed}>
    <label>{t("Job title")}<input name="title" required maxLength={160} defaultValue={job?.title || ''} /></label>
    <label>{t("Description")}<textarea name="description" required maxLength={10000} defaultValue={job?.description || ''} /></label>
    <label>{t("Location")}<input name="location" required maxLength={100} defaultValue={job?.location || ''} /></label>
    <label>{t("Job type")}<select name="job_type" defaultValue={job?.job_type || 'Full-time'}>{['Full-time', 'Part-time', 'Internship', 'Contract'].map(type => <option key={type} value={type}>{t(type)}</option>)}</select></label>
    <label>{t("Category")}<select name="category" defaultValue={job?.category || 'other'}><option value="other">{t("Other")}</option>{categories.map(item => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>
    <label>{t("Experience level")}<input name="experience_level" maxLength={80} defaultValue={job?.experience_level || ''} placeholder={t("e.g. Entry level")} /></label>
    <div className="au-field-row"><label>{t("Minimum monthly salary (USD)")}<input name="salary_min" type="number" min="0" max="1000000" step="1" defaultValue={job?.salary_min ?? ''} /></label><label>{t("Maximum monthly salary (USD)")}<input name="salary_max" type="number" min="0" max="1000000" step="1" defaultValue={job?.salary_max ?? ''} /></label></div>
    <fieldset><legend>{t("Skill requirements")}</legend>{catalog.map(skill => {
      const requirement = requirements.find(item => item.skill_id === skill.id)
      return <div className="requirement-row" key={skill.id}><label className="checkbox"><input type="checkbox" checked={Boolean(requirement)} onChange={e => setRequirements(current => e.target.checked ? [...current, { skill_id: skill.id, required: true, proficiency: 'beginner' }] : current.filter(item => item.skill_id !== skill.id))} />{skill.name}</label>{requirement && <><label className="checkbox"><input type="checkbox" checked={requirement.required} onChange={e => update(skill.id, { required: e.target.checked })} />{t("Required")}</label><label>{t("Proficiency for ")}{skill.name}<select value={requirement.proficiency} onChange={e => update(skill.id, { proficiency: e.target.value })}><option value="beginner">{t("beginner")}</option><option value="intermediate">{t("intermediate")}</option><option value="advanced">{t("advanced")}</option></select></label></>}</div>
    })}</fieldset><button className="primary" disabled={busy || completed || requirements.length > 100}>{busy ? t("Saving…") : job ? t("Save changes") : t("Publish job")}</button>{requirements.length > 100 && <p role="alert">{t("Choose at most 100 skills.")}</p>}
    </fieldset>{error && <p role="alert">{t(error)}</p>}</form>
}

export default function JobEditor({ onChanged }) {
  const { t } = useI18n()
  const { id } = useParams()
  const { api } = useAuth()
  const job = useResource(api, id ? `/api/jobs/${id}` : null)
  const catalog = useResource(api, '/api/skills')
  return <section className="card form-card"><Link to="/employer/jobs">{t("← Your jobs")}</Link><h1>{id ? t("Edit your job") : t("Post an opportunity")}</h1><p>{t("Only jobs owned by your employer account can be edited.")}</p><ResourceState resource={job}><ResourceState resource={catalog}>{catalog.data && (!id || job.data) && <EditorForm key={id || 'new'} job={job.data} catalog={catalog.data} onChanged={onChanged} />}</ResourceState></ResourceState></section>
}
