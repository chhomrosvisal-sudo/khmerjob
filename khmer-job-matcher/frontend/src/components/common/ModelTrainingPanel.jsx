import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { BrainCircuit, RefreshCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResource'
import ResourceState from '../ResourceState'

export default function ModelTrainingPanel() {
  const { t, locale } = useI18n()
  const { api } = useAuth()
  const status = useResource(api, '/api/admin/ml/status')
  const [engine, setEngine] = useState('auto')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function train(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const result = await api('/api/admin/ml/train', { method: 'POST', body: { engine } })
      setMessage(`Model trained and saved using ${result.engine} on ${result.document_count} jobs.`)
      status.reload()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <section className="card ml-training-panel"><div className="section-heading"><div><span className="eyebrow">{t("RECOMMENDATION MODEL")}</span><h2>{t("Machine learning")}</h2></div><BrainCircuit size={27} /></div><ResourceState resource={status}>{status.data && <>
    <div className="ml-model-facts"><span><strong>{status.data.catalog_job_count}</strong>{t("approved, open jobs")}</span><span><strong>{status.data.feature_count ?? '—'}</strong>{t("learned text features")}</span><span><strong>{status.data.available ? t("Ready") : t("Needs training")}</strong>{status.data.engine || t("No saved model")}</span></div>
    {status.data.trained_at && <p className="ml-muted">{t("Last trained: ")}{new Date(status.data.trained_at).toLocaleString(locale)} · {status.data.version}</p>}
    <p className="ml-muted">{t("The model learns vocabulary and IDF weights from public job listings only. Profile and resume text are not saved in its artifact. Catalog changes automatically refresh the model on the next recommendation request.")}</p>
    {!status.data.sklearn_installed && <p className="notice">{t("scikit-learn is not installed on the server. Auto mode uses the built-in TF-IDF implementation. Install backend requirements to train with scikit-learn.")}</p>}
    <form onSubmit={train}><label>{t("Training engine")}<select value={engine} disabled={busy} onChange={event => setEngine(event.target.value)}><option value="auto">{t("Auto: scikit-learn when available")}</option><option value="sklearn">{t("Require scikit-learn")}</option><option value="builtin">{t("Built-in reference TF-IDF")}</option></select></label><button className="primary" disabled={busy || !status.data.catalog_job_count}><RefreshCw size={15} />{busy ? t("Training…") : t("Train / refresh model")}</button></form>
    {!status.data.catalog_job_count && <p>{t("No open, approved job listings are available for training.")}</p>}
  </>}</ResourceState>{error && <p className="notice" role="alert">{t(error)}</p>}{message && <p className="notice" role="status">{t(message)}</p>}</section>
}
