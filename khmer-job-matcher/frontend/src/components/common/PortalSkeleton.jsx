import { useI18n } from '../../i18n/useI18n'
export default function PortalSkeleton() {
  const { t } = useI18n()
  return <div className="portal-skeleton" role="status" aria-label={t("Loading opportunities")}><span className="sr-only">{t("Loading opportunities…")}</span><div className="skeleton-block" /><div className="skeleton-grid">{[1, 2, 3].map(item => <div className="skeleton-block" key={item} />)}</div></div>
}
