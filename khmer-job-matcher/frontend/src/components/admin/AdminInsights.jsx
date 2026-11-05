import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResource'
import { useI18n } from '../../i18n/useI18n'
import ResourceState from '../ResourceState'

export default function AdminInsights({ activity = false, revision }) {
  const { api } = useAuth()
  const { t, locale } = useI18n()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [includeDemo, setIncludeDemo] = useState(false)
  const resource = useResource(api, activity
    ? `/api/admin/activity-logs?page=${page}&page_size=20&action=${encodeURIComponent(action)}`
    : `/api/admin/skill-gaps?include_demo=${includeDemo}`, revision)
  const data = resource.data
  return <section className="admin-panel admin-insights">
    {activity ? <>
      <p>{t('Administrator changes recorded from this release onward. Earlier actions are not reconstructed.')}</p>
      <label>{t('Action')} <select value={action} onChange={event => { setAction(event.target.value); setPage(1) }}>
        <option value="">{t('All actions')}</option>
        {['user.access_changed', 'company.approval_changed', 'job.access_changed', 'skill.created', 'model.trained'].map(value => <option key={value}>{value}</option>)}
      </select></label>
    </> : <>
      <p>{t('Required skills in open jobs from approved employers, compared with active job-seeker profiles. Missing a skill does not imply interest in that job or inability to do it.')}</p>
      <label><input type="checkbox" checked={includeDemo} onChange={event => setIncludeDemo(event.target.checked)} />{t('Include fictional demo jobs')}</label>
    </>}
    <ResourceState resource={resource}>{data && <>
      {!activity && <p>{t('Profiles')}: {data.students} · {t('Job listings')}: {data.jobs}</p>}
      {!data.items.length ? <p>{t(activity ? 'No administrator changes recorded for this filter.' : 'No required skills found for the selected jobs.')}</p> : <div className="admin-table-scroll"><table className="admin-table">
        <thead><tr>{(activity ? ['Date', 'Administrator ID', 'Action', 'Record', 'Changes'] : ['Skill', 'Jobs requiring skill', 'Profiles with skill', 'Profiles missing skill', 'Coverage']).map(label => <th key={label}>{t(label)}</th>)}</tr></thead>
        <tbody>{data.items.map(row => activity ? <tr key={row.id}>
          <td>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(row.created_at + 'Z'))} UTC</td>
          <td>{row.actor_id ?? t('Deleted account')}</td><td>{row.action}</td><td>{row.target_type} #{row.target_id}</td>
          <td>{Object.entries(row.changes).map(([key, value]) => <div key={key}>{key}: {typeof value === 'object' && value !== null ? `${String(value.before)} → ${String(value.after)}` : String(value)}</div>)}</td>
        </tr> : <tr key={row.skill_id}><td>{row.name}</td><td>{row.jobs_requiring}</td><td>{row.students_with_skill}</td><td>{row.students_missing_skill}</td><td>{row.coverage_percent === null ? t('No profiles') : `${row.coverage_percent}%`}</td></tr>)}</tbody>
      </table></div>}
      {activity && <div className="admin-table-pagination"><span>{t('Page')} {page} · {data.total} {t('records')}</span><div>
        <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t('Previous')}</button>
        <button disabled={page * 20 >= data.total} onClick={() => setPage(value => value + 1)}>{t('Next')}</button>
      </div></div>}
    </>}</ResourceState>
  </section>
}
