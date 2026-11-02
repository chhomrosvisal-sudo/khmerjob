import { useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../hooks/useResource'
import { useI18n } from '../i18n/useI18n'
import { loadCatalog } from '../services/catalog'
import CategoryGrid from '../components/jobs/CategoryGrid'

export default function JobCategories() {
  const { api } = useAuth()
  const { t } = useI18n()
  const catalogApi = useCallback((path, options) => loadCatalog(api, {}, options), [api])
  const resource = useResource(catalogApi, 'category-catalog')
  return <section>
    <h1>{t('Job Categories')}</h1>
    {resource.loading && <p role="status">{t('Loading…')}</p>}
    {resource.error && <div className="portal-error" role="alert"><p>{resource.error}</p><button onClick={resource.reload}>{t('Try again')}</button></div>}
    <CategoryGrid jobs={resource.data || []} showCounts={Boolean(resource.data)} />
  </section>
}
