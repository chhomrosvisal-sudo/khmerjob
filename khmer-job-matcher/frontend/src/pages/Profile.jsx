import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import { categories } from '../services/catalog'

function ProfileForm({ profile, catalog, onChanged }) {
  const { t } = useI18n()
  const { api } = useAuth()
  const [selected, setSelected] = useState(profile.skills.map(skill => skill.id))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name').trim()
    if (!name) { setError('Please enter your name.'); return }
    setBusy(true); setMessage(''); setError('')
    try {
      await api('/api/students/me', { method: 'PATCH', body: { name, education: form.get('education').trim(), interests: form.get('interests').trim(), experience: form.get('experience').trim(), preferred_location: form.get('preferred_location').trim(), preferred_category: form.get('preferred_category'), skill_ids: selected } })
      onChanged(); setMessage('Profile saved to your account.')
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit}><fieldset disabled={busy} className="form-fields">
    <label>{t("Name")}<input name="name" required maxLength={80} defaultValue={profile.name} /></label>
    <label>{t("Education")}<input name="education" maxLength={160} defaultValue={profile.education} /></label>
    <label>{t("Interests")}<textarea name="interests" maxLength={1000} defaultValue={profile.interests} /></label>
    <label>{t("Experience")}<textarea name="experience" maxLength={2000} defaultValue={profile.experience || ''} placeholder={t("Projects, internships, or work experience")} /></label>
    <label>{t("Preferred location")}<input name="preferred_location" maxLength={100} defaultValue={profile.preferred_location || ''} placeholder={t("e.g. Phnom Penh")} /></label>
    <label>{t("Preferred job category")}<select name="preferred_category" defaultValue={profile.preferred_category || ''}><option value="">{t("No preference")}</option>{categories.map(item => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>
    <fieldset><legend>{t("Your skills")}</legend><div className="skill-options">{catalog.map(skill => <label className="checkbox" key={skill.id}><input type="checkbox" checked={selected.includes(skill.id)} onChange={e => setSelected(e.target.checked ? [...selected, skill.id] : selected.filter(id => id !== skill.id))} />{skill.name}{skill.name_km && ` / ${skill.name_km}`}</label>)}</div>{!catalog.length && <p>{t("The skill catalog is empty. Ask an administrator to add skills.")}</p>}</fieldset>
    <button className="primary" disabled={busy || selected.length > 100}>{busy ? t("Saving…") : t("Save profile")}</button>
    {selected.length > 100 && <p role="alert">{t("Choose at most 100 skills.")}</p>}
  </fieldset>{error && <p role="alert">{t(error)}</p>}<p role="status">{t(message)}</p></form>
}

export default function Profile({ onChanged }) {
  const { t } = useI18n()
  const { api } = useAuth()
  const profile = useResource(api, '/api/students/me')
  const catalog = useResource(api, '/api/skills')
  return <section className="card form-card"><h1>{t("My profile")}</h1><p>{t("Your education, interests, and skills are saved to your account.")}</p><ResourceState resource={profile}><ResourceState resource={catalog}>{profile.data && catalog.data && <ProfileForm profile={profile.data} catalog={catalog.data} onChanged={onChanged} />}</ResourceState></ResourceState></section>
}
