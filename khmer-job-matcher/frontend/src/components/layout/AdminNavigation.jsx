import { NavLink } from 'react-router-dom'
import { adminNavigation } from '../../services/admin-navigation'
import { useI18n } from '../../i18n/useI18n'



export default function AdminNavigation({ onNavigate, language }) {
  const { t } = useI18n()
  return <nav className="admin-grouped-nav" aria-label={t('Main navigation')} lang={language}>
    {adminNavigation.map(group => <section key={group.label} aria-label={t(group.label)}>
      <h2 className="nav-caption nav-label">{t(group.label)}</h2>
      <div className="admin-nav-items">{group.items.map(({ label, path, icon: Icon }) => path
        ? <NavLink end to={path} key={label} title={t(label)} aria-label={t(label)} onClick={onNavigate}><Icon size={18} /><span className="nav-label">{t(label)}</span></NavLink>
        : <button type="button" disabled className="admin-nav-planned" key={label} title={`${t(label)} - ${t('Coming soon')}`} aria-label={`${t(label)} - ${t('Coming soon')}`}><Icon size={18} /><span className="nav-label">{t(label)}<small>{t('Coming soon')}</small></span></button>
      )}</div>
    </section>)}
  </nav>
}
