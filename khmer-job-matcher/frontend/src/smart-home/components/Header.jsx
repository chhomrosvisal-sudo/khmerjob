import { useI18n } from '../../i18n/useI18n'
import { LanguageSwitcher } from '../../i18n/LanguageContext'
import { Search, Settings2, Bell, ChevronDown, SlidersHorizontal, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { members } from '../data/members'

export default function Header({ search, setSearch, openSettings, notifications, setNotifications, notificationsEnabled, onSignOut, loggingOut }) {
  const { t } = useI18n()
  return <header className="sh-header"><label className="sh-search"><Search size={18} /><span className="sr-only">{t("Search devices")}</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Search")} />{search && <button type="button" onClick={() => setSearch('')} aria-label={t("Clear device search")}>×</button>}</label>
    <div className="sh-header-actions"><LanguageSwitcher compact /><button className="sh-icon-button" onClick={openSettings} aria-label={t("Open Smart Home settings")}><Settings2 size={20} /></button>
      <details className="sh-dropdown"><summary className="sh-icon-button" aria-label={t("Notifications")}><Bell size={20} />{notifications && notificationsEnabled && <span className="sh-notification-dot" />}</summary><div className="sh-dropdown-panel"><h3>{t("Notifications")}</h3><p>{!notificationsEnabled ? t("Notifications are paused in settings.") : notifications ? t("Your simulated home is ready. Use the switches to explore your devices.") : t("You are all caught up.")}</p><span className="sh-demo-label">{t("Demo notification")}</span>{notifications && notificationsEnabled && <button onClick={() => setNotifications(false)}><Check size={14} />{t("Mark as read")}</button>}</div></details>
      <span className="sh-header-divider" /><details className="sh-dropdown sh-profile"><summary><Avatar member={members[0]} size={38} /><span>Scarlett<small>{t("Home admin")}</small></span><ChevronDown size={14} /></summary><div className="sh-dropdown-panel"><h3>{t("Hello, Scarlett")}</h3><Link to="/smart-home/members">{t("View demo member profile")}</Link><button onClick={openSettings}><SlidersHorizontal size={14} />{t("Home preferences")}</button>{onSignOut ? <button disabled={loggingOut} onClick={onSignOut}>{loggingOut ? t("Signing out…") : t("Sign out")}</button> : <Link to="/">{t("Leave demo")}</Link>}</div></details>
    </div>
  </header>
}
