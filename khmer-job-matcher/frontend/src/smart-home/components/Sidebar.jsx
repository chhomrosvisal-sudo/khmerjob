import { useI18n } from '../../i18n/useI18n'
import { Link, NavLink } from 'react-router-dom'
import { House, LayoutDashboard, Blocks, ShieldCheck, DoorOpen, UsersRound, ChartNoAxesCombined, LogOut, Sparkles } from 'lucide-react'

const links = [['', 'Dashboard', LayoutDashboard], ['/devices', 'Devices', Blocks], ['/security', 'Security', ShieldCheck], ['/rooms', 'Rooms', DoorOpen], ['/members', 'Family Members', UsersRound], ['/analytics', 'Analytics', ChartNoAxesCombined]]

export default function Sidebar({ onSignOut, loggingOut }) {
  const { t } = useI18n()
  return <aside className="sh-sidebar"><Link className="sh-house-logo" to="/smart-home" aria-label={t("Smart Home overview")}><House size={29} strokeWidth={1.8} /><span className="sh-logo-spark"><Sparkles size={10} /></span></Link>
    <nav aria-label={t("Smart Home navigation")}><Link to="/" className="sh-nav-item" aria-label={t("Home website")} data-tip={t("Home website")}><House size={22} /></Link>{links.map(([path, label, Icon]) => <NavLink end to={'/smart-home' + path} key={label} className={({ isActive }) => `sh-nav-item ${isActive ? 'active' : ''}`} aria-label={t(label)} data-tip={t(label)}><Icon size={22} strokeWidth={1.65} /></NavLink>)}</nav>
    {onSignOut ? <button className="sh-nav-item sh-exit" data-tip={loggingOut ? 'Signing out…' : 'Sign out'} aria-label={t("Sign out of dashboard")} disabled={loggingOut} onClick={onSignOut}><LogOut size={22} /></button> : <Link to="/" className="sh-nav-item sh-exit" data-tip={t("Leave demo")} aria-label={t("Leave Smart Home demo")}><LogOut size={22} /></Link>}
  </aside>
}
