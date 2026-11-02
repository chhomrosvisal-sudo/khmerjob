import { useI18n } from '../i18n/useI18n'
export default function ResourceState({ resource, children }) {
  const { t } = useI18n()
  if (resource.loading) return <div role="status" aria-busy="true" className="card"><p>{t('Loading…')}</p><div aria-hidden="true" className="resource-skeleton"><span /><span /><span /></div></div>
  if (resource.error) return <section className="card error"><p role="alert">{t(resource.error)}</p><button onClick={resource.reload}>{t("Try again")}</button></section>
  return children
}
