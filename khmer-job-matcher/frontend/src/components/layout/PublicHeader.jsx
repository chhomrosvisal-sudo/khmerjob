import { LanguageSwitcher } from '../../i18n/LanguageContext'
import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BriefcaseBusiness, Menu, X, ArrowUpRight, Bell } from 'lucide-react'

export default function PublicHeader({ user, onSignOut, loggingOut, unreadCount = 0 }) {
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
          <NavLink to="/companies">{t("Companies")}</NavLink><NavLink to="/categories">{t("Job Categories")}</NavLink><NavLink to="/career-advice">{t("Career Advice")}</NavLink>
        </nav>
        <div className="portal-account"><LanguageSwitcher compact />
          {user && <><Link className="portal-login" to={user.role === 'admin' ? '/dashboard' : user.role === 'employer' ? '/employer/jobs' : '/account'}>{user.role === 'admin' ? t("Dashboard") : user.role === 'employer' ? t("My Jobs") : t("My Account")}</Link><button className="portal-signout" disabled={loggingOut} onClick={onSignOut}>{loggingOut ? t("Signing out…") : t("Sign out")}</button></>}
          {user && <Link to={user.role === 'student' ? '/account/notifications' : user.role === 'admin' ? '/dashboard/notifications' : '/notifications'} aria-label={t('Notifications')}><Bell size={16} />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</Link>}
          <Link className="portal-employer" to={user ? '/employer/jobs' : '/login?portal=employer'}>{t("Employer Portal")}<ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </div>
  </header>
}
