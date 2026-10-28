import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { Upload, Download, Trash2, FileText } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import { downloadFile } from '../services/download'
import ResourceState from '../components/ResourceState'

export default function Resumes({ onChanged }) {
  const { t, locale } = useI18n()
  const { api } = useAuth()
  const resumes = useResource(api, '/api/resumes')
  const capabilities = useResource(api, '/api/resumes/capabilities')
  const profile = useResource(api, '/api/students/me')
  const skills = useResource(api, '/api/skills')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [review, setReview] = useState(null)
  const [selected, setSelected] = useState([])
  async function upload(event) {
    event.preventDefault()
    const form = event.currentTarget
    const file = new FormData(form).get('resume')
    if (!file?.size) { setError('Choose a resume first.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Maximum resume size is 5 MB.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await api('/api/resumes?' + new URLSearchParams({ filename: file.name }), { method: 'POST', raw: true, body: file })
      setReview(result); setSelected(result.detected_skill_ids); resumes.reload(); form.reset()
      setMessage('Resume uploaded privately. Review detected skills before adding them to your profile.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function act(callback) {
    setBusy(true); setError('')
    try { await callback() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function saveSkills() {
    const ids = [...new Set([...(profile.data?.skills.map(item => item.id) || []), ...selected])]
    await api('/api/students/me', { method: 'PATCH', body: { skill_ids: ids } })
    profile.reload(); onChanged(); setReview(null); setMessage('Reviewed skills added to your profile.')
  }
  return <section><div className="section-heading"><div><h2>{t("My resumes")}</h2><p>{t("Private files · Up to 5 MB each · Keep up to 10 versions")}</p></div><FileText size={26} /></div><section className="card"><form onSubmit={upload}><label>{t("Choose your resume")}<input type="file" name="resume" accept={capabilities.data?.pdf_enabled ? '.pdf,.txt' : '.txt'} required disabled={busy} /></label><p>{t("Text resumes are supported. ")}{capabilities.data?.pdf_enabled ? t("Text-based PDF resumes are also supported; scanned PDF OCR is unavailable.") : t("PDF parsing requires PyMuPDF to be installed on the server.")}{t(" The latest version is attached when you apply for a job. Delete a version to remove employer access to that file.")}</p><button className="primary" disabled={busy}><Upload size={16} />{busy ? t("Please wait…") : t("Upload resume")}</button></form></section>{message && <p className="notice" role="status">{t(message)}</p>}{error && <p className="notice" role="alert">{t(error)}</p>}
    {review && <section className="card"><h3>{t("Review detected skills")}</h3><p>{t("These are suggestions, not confirmed skills. Only select skills you can demonstrate.")}</p><div className="skill-options">{(skills.data || []).filter(skill => review.detected_skill_ids.includes(skill.id)).map(skill => <label className="checkbox" key={skill.id}><input type="checkbox" checked={selected.includes(skill.id)} onChange={event => setSelected(current => event.target.checked ? [...current, skill.id] : current.filter(id => id !== skill.id))} />{skill.name}</label>)}</div>{!review.detected_skill_ids.length && <p>{t("No catalog skills were detected. You can add skills manually in your profile.")}</p>}<button disabled={busy || !selected.length || profile.loading || Boolean(profile.error)} onClick={() => act(saveSkills)}>{t("Add reviewed skills")}</button><button onClick={() => setReview(null)}>{t("Skip review")}</button></section>}
    <ResourceState resource={resumes}>{resumes.data?.map(item => <article className="card resume-row" key={item.id}><div><h3>{item.filename}</h3><p>{Math.ceil(item.size / 1024)}{t(" KB · ")}{new Date(item.created_at).toLocaleDateString(locale)}</p></div><button disabled={busy} onClick={() => act(() => downloadFile(api, `/api/resumes/${item.id}/file`, item.filename))}><Download size={16} />{t("Download")}</button><button disabled={busy} onClick={() => act(async () => { await api(`/api/resumes/${item.id}`, { method: 'DELETE' }); resumes.reload(); if (review?.id === item.id) setReview(null); setMessage('Resume deleted. Existing applications no longer expose this file.') })}><Trash2 size={16} />{t("Delete")}</button></article>)}</ResourceState>
  </section>
}
