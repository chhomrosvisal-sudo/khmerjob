import { useI18n } from '../i18n/useI18n'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrainCircuit, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import ResourceState from '../components/ResourceState'
import JobCard from '../components/JobCard'

const labels = { skill_coverage: 'Required skills', text_similarity: 'Profile / job text', location: 'Preferred location', category: 'Preferred category' }
const maximum = { skill_coverage: 65, text_similarity: 25, location: 5, category: 5 }

export default function Recommendations({ cardProps }) {
  const { t, locale } = useI18n()
  const { api } = useAuth()
  const [page, setPage] = useState(1)
  const [minScore, setMinScore] = useState(0)
  const [jobType, setJobType] = useState('')
  const matchApi = useCallback((path, options) => api(path, { ...options, method: 'POST' }), [api])
  const path = '/api/match?' + new URLSearchParams({ page, page_size: 6, min_score: minScore, job_type: jobType })
  const resource = useResource(matchApi, path)
  return <section className="ml-recommendations"><div className="section-heading"><div><span className="eyebrow">{t("DISCOVER WHERE YOU FIT")}</span><h2>{t("Recommended jobs")}</h2><p>{t("A catalog-trained text model, combined with your skills and preferences.")}</p></div><BrainCircuit size={29} /></div>
    <div className="ml-actions"><Link to="/account/profile">{t("Update my skills and preferences")}</Link><button disabled={resource.loading} onClick={resource.reload}><RefreshCw size={14} />{t("Refresh recommendations")}</button></div>
    <div className="management-filters"><label>{t("Minimum compatibility")}<select value={minScore} onChange={event => { setMinScore(Number(event.target.value)); setPage(1) }}>{[0, 25, 50, 75].map(value => <option key={value} value={value}>{value === 0 ? t("Show all scores") : t("{v0}% and above", {v0: value})}</option>)}</select></label><label>{t("Employment type")}<select value={jobType} onChange={event => { setJobType(event.target.value); setPage(1) }}><option value="">{t("All types")}</option>{['Full-time', 'Part-time', 'Internship', 'Contract'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label></div>
    <ResourceState resource={resource}>{resource.data && <>
      <section className="card ml-model-summary"><Sparkles size={22} /><div><strong>{t("Learned from ")}{resource.data.model.document_count}{t(" current job listings")}</strong><p>{resource.data.total}{t(" opportunities match these filters. Scores are estimates of compatibility, not hiring probabilities.")}</p></div></section>
      {!resource.data.profile_ready && <p className="notice">{t("Add skills, interests, and experience to your profile so recommendations have useful information to compare.")}</p>}
      <details className="card ml-method"><summary>{t("How the recommendation model works")}</summary><p>{t(resource.data.formula)}</p><p>{t(resource.data.limitations)}</p><p className="ml-muted">{t("Training engine: ")}{t(resource.data.engine)}{t(". Model: ")}{resource.data.model.version}{t(". Last trained: ")}{new Date(resource.data.model.trained_at).toLocaleString(locale)}.</p><p className="ml-muted">{t("The model is fitted on job listings; it compares your profile at request time and does not save your profile in the model file.")}</p></details>
      <div className="job-grid">{resource.data.items.map(item => <article key={item.job_id} className="match-result"><JobCard job={item.job} {...cardProps} showCoverage={false} saved={cardProps.savedIds.includes(item.job_id)} pending={cardProps.pendingIds.includes(item.job_id) || cardProps.savedLoading} /><section>
        <div className="ml-score-heading"><strong>{item.score}{t("% compatibility estimate")}</strong><span>{item.components.skill_coverage}{t("% required-skill coverage")}</span></div><progress value={item.score} max="100" aria-label={t("Compatibility estimate for {v0}", {v0: item.job.title})} />
        <details className="ml-score-breakdown"><summary>{t("See score breakdown")}</summary><div className="status-bars">{Object.entries(item.weighted_points).map(([key, value]) => <div key={key}><span>{t(labels[key])}</span><progress value={value} max={maximum[key]} aria-label={t("{v0} points for {v1}", {v0: t(labels[key]), v1: item.job.title})} /><strong>{t(value)} / {maximum[key]}</strong></div>)}</div></details>
        <p><strong>{t("Matched skills:")}</strong> {item.matched_skills.join(', ') || t("No required skills matched yet")}</p><p><strong>{t("Skills to learn:")}</strong> {item.learning_topics.join(', ') || t("No missing required skills")}</p>
        <small>{item.components.location_match ? t("Preferred location matches. ") : ''}{item.components.category_match ? t("Preferred category matches. ") : ''}{t("Read the full requirements before applying.")}</small>
      </section></article>)}</div>
      {!resource.data.items.length && <section className="card"><h3>{t("No recommendations in this view")}</h3><p>{t("Try a lower minimum score or another employment type.")}</p><button onClick={() => { setMinScore(0); setJobType(''); setPage(1) }}>{t("Clear filters")}</button></section>}
      <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Previous")}</button><span>{t("Page {page} of {pages}", { page: page, pages: Math.max(1, Math.ceil(resource.data.total / 6)) })}</span><button disabled={page * 6 >= resource.data.total} onClick={() => setPage(page + 1)}>{t("Next")}</button></div>
    </>}</ResourceState>
  </section>
}
