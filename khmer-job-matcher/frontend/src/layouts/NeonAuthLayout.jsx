import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../i18n/LanguageContext'
import { useI18n } from '../i18n/useI18n'
import '../auth.css'
import './NeonAuthLayout.css'

export default function NeonAuthLayout({ title, alternate, alternateFirst = false, children, feedback }) {
  const { t } = useI18n()

  return <main className="auth-kit neon-login">
    <div className="neon-login-art" aria-hidden="true"><i /><i /><i /><i /></div>
    <div className="neon-login-top">
      <Link to="/">{t("Back to website ")}<ArrowUpRight size={14} /></Link>
      <LanguageSwitcher compact />
    </div>
    <section className="neon-login-panel" aria-labelledby="neon-login-title">
      <div className="neon-login-tabs">
        {alternateFirst && alternate}
        <h1 id="neon-login-title">{title}</h1>
        {!alternateFirst && alternate}
      </div>
      <div className="neon-login-content">
        {children}
      </div>
    </section>
    {feedback}
  </main>
}
