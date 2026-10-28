import { useI18n } from '../i18n/useI18n'
export default function ResourceState({ resource, children }) {
  const { t } = useI18n()
  if (resource.loading) return <p role="status" className="card">{t("Loading…")}</p>
  if (resource.error) return <section className="card error"><p role="alert">{t(resource.error)}</p><button onClick={resource.reload}>{t("Try again")}</button></section>
  return children
}
