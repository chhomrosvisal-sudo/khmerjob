import { useI18n } from '../i18n/useI18n'
import { LanguageSwitcher } from '../i18n/LanguageContext'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import AuthCard from '../components/auth/AuthCard'
import AuthIllustration from '../components/auth/AuthIllustration'
import Logo from '../components/auth/Logo'
import '../auth.css'

export default function AuthLayout({ children, variant = 'login', demo = false }) {
  const { t } = useI18n()
  return <div className={`auth-kit auth-${variant}`}><div className="au-topline"><Link to="/">{t("Back to website ")}<ArrowUpRight size={13} /></Link><span><ShieldCheck size={13} />{demo ? t("Clearly labeled frontend demo") : t("Your account. Your next chapter.")}</span><LanguageSwitcher compact /></div><AuthCard illustration={<AuthIllustration variant={variant} />}><Logo />{children}</AuthCard><footer className="au-page-footer"><span>{t("Khmer Job & Skills Matcher")}</span><span>{t("Made for your next opportunity.")}</span></footer></div>
}
