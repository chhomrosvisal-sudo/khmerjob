import { LanguageSwitcher } from '../../i18n/LanguageContext'
import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BriefcaseBusiness, Menu, X, ArrowUpRight, Bell } from 'lucide-react'

export default function PublicHeader({ user, onSignOut, loggingOut }) {
  const location = useLocation()
  const [openRoute, setOpenRoute] = useState(null)
  const routeKey = location.pathname + location.hash
  const open = openRoute === routeKey
  const { language, t } = useI18n()
  return <header className="portal-header" onKeyDown={event => { if (event.key === 'Escape') setOpenRoute(null) }}>
    <div className="portal-header-inner">
      <Link to="/" className="portal-brand" aria-label={t("KhmerJob home")}><span className="portal-logo"><BriefcaseBusiness size={25} strokeWidth={2.3} /></span><span>Khmer<span>Job</span><small>{t("OPPORTUNITY STARTS HERE")}</small></span></Link>
      <button className="portal-menu-toggle" aria-label={open ? t("Close menu") : t("Open menu")} aria-expanded={open} aria-controls="website-menu" onClick={() => setOpenRoute(open ? null : routeKey)}>{open ? <X /> : <Menu />}</button>
      <div id="website-menu" className={`portal-navigation ${open ? 'is-open' : ''}`}>
        <nav aria-label={t("Website navigation")} lang={language} onClick={event => { if (event.target.closest('a')) setOpenRoute(null) }}>
          <NavLink end to="/">{t("Home")}</NavLink><NavLink to="/jobs">{t("Find Jobs")}</NavLink>
          <Link to="/companies">{t("Companies")}</Link><Link to="/#categories">{t("Job Categories")}</Link><Link to="/#career-advice">{t("Career Advice")}</Link>
        </nav>
        <div className="portal-account"><LanguageSwitcher compact />
          {user ? <><Link className="portal-login" to={user.role === 'admin' ? '/dashboard' : user.role === 'employer' ? '/employer/jobs' : '/account'}>{user.role === 'admin' ? t("Dashboard") : user.role === 'employer' ? t("My Jobs") : t("My Account")}</Link><button className="portal-signout" disabled={loggingOut} onClick={onSignOut}>{loggingOut ? t("Signing out…") : t("Sign out")}</button></> : <><Link className="portal-login" to="/login">{t("Login")}</Link><Link className="portal-register" to="/register">{t("Register")}</Link></>}
          {user?.role === 'student' && <Link to="/account/notifications" aria-label={t("Application notifications")}><Bell size={16} /></Link>}
          <Link className="portal-employer" to={user ? '/employer/jobs' : '/login?portal=employer'}>{t("Employer Portal")}<ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </div>
  </header>
}
