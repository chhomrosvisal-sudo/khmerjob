import { useI18n } from '../../i18n/useI18n'
export default function AuthCard({ children, illustration }) {
  const { t } = useI18n()
  return <div className="au-card"><section className="au-form-column">{children}</section><aside className="au-art-column" aria-label={t("Account security illustration")}>{illustration}</aside></div>
}
