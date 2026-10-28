import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BriefcaseBusiness, Sparkles, UserRound, Settings, LogOut, Menu, Bell, Search, GraduationCap, PanelLeftClose } from 'lucide-react'
import { AuthProvider } from './hooks/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useResource } from './hooks/useResource'
import { LanguageProvider, LanguageSwitcher } from './i18n/LanguageContext'
import { useI18n } from './i18n/useI18n'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import VerifyCode from './pages/auth/VerifyCode'
import ResetPassword from './pages/auth/ResetPassword'
import { RecoveryProvider } from './context/RecoveryContext'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import PublicHeader from './components/layout/PublicHeader'
import PublicFooter from './components/layout/PublicFooter'
import { Jobs, JobDetails } from './pages/Jobs'
import JobEditor from './pages/JobEditor'
import Protected from './components/common/RequireAuth'
import Account from './pages/Account'
import AdminDashboard from './pages/AdminDashboard'
import EmployerDashboard from './pages/EmployerDashboard'
import { Companies, CompanyProfile } from './pages/Companies'
import EmployerRegister from './pages/auth/EmployerRegister'
import SocialCallback from './pages/auth/SocialCallback'
import SocialLoginButtons from './components/auth/SocialLoginButtons'
import ThemeToggle from './components/common/ThemeToggle'

const SmartHomeDashboard = lazy(() => import('./smart-home/SmartHomeDashboard'))

const navigation = [
  ['/dashboard', 'Dashboard', 'ទំព័រដើម', LayoutDashboard, 'admin'],
  ['/jobs', 'Find Jobs', 'ស្វែងរកការងារ', BriefcaseBusiness],
  ['/matcher', 'Skill Matcher', 'ផ្គូផ្គងជំនាញ', Sparkles, 'student'],
  ['/profile', 'My Profile', 'ប្រវត្តិរូប', UserRound, 'student'],
  ['/employer/jobs', 'My Jobs', 'ការងាររបស់ខ្ញុំ', BriefcaseBusiness, 'employer'],
  ['/employer/applications', 'Applicants', 'បេក្ខជន', UserRound, 'employer'],
  ['/employer/company', 'Company', 'ក្រុមហ៊ុន', BriefcaseBusiness, 'employer'],
  ['/employer/analytics', 'Analytics', 'របាយការណ៍', LayoutDashboard, 'employer'],
  ['/settings', 'Settings', 'ការកំណត់', Settings],
]

function Workspace() {
  const { api, user, signOut, message } = useAuth()
  const location = useLocation()
  const dashboardView = (user?.role === 'admin' && ['/dashboard', '/settings'].includes(location.pathname)) || (user?.role === 'employer' && location.pathname.startsWith('/employer/'))
  const [revision, setRevision] = useState(0)
  const onChanged = useCallback(() => setRevision(value => value + 1), [])
  const profile = useResource(api, user?.role === 'student' ? '/api/students/me' : null, revision)
  const saved = useResource(api, user?.role === 'student' ? '/api/saved-jobs' : null, revision)
  const { language, t, storageError: languageError } = useI18n()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notice, setNotice] = useState(false)
  const [actionError, setActionError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingIds, setPendingIds] = useState([])
  const pending = useRef(new Set())
  const items = navigation.filter(item => !item[4] || item[4] === user?.role)
  const title = t(items.find(item => item[0] === location.pathname)?.[1] || 'Khmer Job Matcher')
  async function toggle(id) {
    if (!saved.data || pending.current.has(id)) return
    pending.current.add(id); setPendingIds([...pending.current]); setActionError('')
    try { await api(`/api/saved-jobs/${id}`, { method: saved.data.includes(id) ? 'DELETE' : 'POST' }); onChanged() }
    catch (failure) { setActionError(failure.message) }
    finally { pending.current.delete(id); setPendingIds([...pending.current]) }
  }
  async function logout() { setLoggingOut(true); await signOut() }
  const cardProps = {
    skills: profile.data?.skills || [], showCoverage: Boolean(profile.data), savedIds: saved.data || [],
    canSave: user?.role === 'student', savedLoading: saved.loading || Boolean(saved.error), toggle, pendingIds,
  }
  return <div className={dashboardView ? `app ${collapsed ? 'collapsed' : ''}` : 'public-site'}>
    <a className="skip-link" href="#main">{t("Skip to content")}</a>
    {dashboardView && open && <button className="scrim" aria-label={t("Close navigation")} onClick={() => setOpen(false)} />}
    {dashboardView && <aside className={open ? 'sidebar open' : 'sidebar'} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
      <Link to="/dashboard" className="brand" onClick={() => setOpen(false)}><span className="brand-icon"><GraduationCap /></span><span className="nav-label">Khmer<span className="brand-sub">{t("Job & Skills Matcher")}</span></span></Link>
      <p className="nav-caption nav-label">{t("YOUR WORKSPACE")}</p>
      <nav aria-label={t("Main navigation")} lang={language}>{items.map(([to, en, , Icon]) => <NavLink end to={to} key={to} title={t(en)} aria-label={t(en)} onClick={() => setOpen(false)}><Icon size={20} /><span className="nav-label">{t(en)}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><Link className="website-link" to="/">{t("Back to website")}</Link><div className="sidebar-tip nav-label"><Sparkles size={22} /><h3>{t("A little progress, every day.")}</h3><p>{t("Build your skills. Find your opportunity.")}</p><Link to={user?.role === 'student' ? '/matcher' : '/jobs'} onClick={() => setOpen(false)}>{t("Explore opportunities →")}</Link></div>
        {user ? <button onClick={logout} disabled={loggingOut} aria-label={t("Sign out")}><LogOut size={19} /><span className="nav-label">{loggingOut ? t("Signing out…") : t("Sign out")}</span></button> : <Link to="/login" onClick={() => setOpen(false)}>{t("Sign in")}</Link>}
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={t("Toggle sidebar width")}><PanelLeftClose size={19} /><span className="nav-label">{t("Collapse sidebar")}</span></button>
      </div>
    </aside>}
    {!dashboardView && <PublicHeader user={user} onSignOut={logout} loggingOut={loggingOut} />}
    <div className={dashboardView ? 'workspace' : 'public-workspace'}>{dashboardView && <header><div className="row"><button className="icon-button mobile-menu" aria-label={t("Toggle navigation")} aria-expanded={open} onClick={() => setOpen(!open)}><Menu /></button><strong>{t(title)}</strong></div><div className="row"><LanguageSwitcher compact /><Link className="icon-button" to="/jobs" aria-label={t("Search jobs")}><Search size={20} /></Link><button className="icon-button" aria-label={t("Notification availability")} aria-expanded={notice} onClick={() => setNotice(!notice)}><Bell size={20} /></button><Link to={user?.role === 'student' ? '/profile' : user ? '/settings' : '/login'} className="avatar" aria-label={t("Account")}>{(profile.data?.name || user?.email || '?').slice(0, 1).toUpperCase()}</Link></div></header>}
      <main id="main" tabIndex={-1}>
        {dashboardView && <div className="demo-note"><span className="status-dot" />{t(" YOUR CAREER, IN PROGRESS ")}<span>{t("Discover. Build. Grow.")}</span></div>}
        {message && <p className="notice" role="status">{t(message)}</p>}
        {location.state?.message && <p className="notice" role="status">{location.state.message}</p>}
        {notice && <p className="notice" role="status">{t("Live notifications are not implemented.")}</p>}
        {actionError && <p className="notice" role="alert">{actionError}</p>}
        {languageError && <p role="alert">{languageError}</p>}
        {[profile, saved].map((resource, index) => resource.error && <div className="card" key={index}><p role="alert">{index === 0 ? t("Profile") : t("Saved jobs")}: {resource.error}</p><button onClick={resource.reload}>{t("Retry ")}{index === 0 ? t("profile") : t("saved jobs")}</button></div>)}
        <Routes>
          <Route path="/" element={<Home cardProps={cardProps} revision={revision} />} />
          <Route path="/dashboard" element={<Protected role="admin"><AdminDashboard /></Protected>} />
          <Route path="/account/*" element={<Protected role="student"><Account profile={profile.data} cardProps={cardProps} onChanged={onChanged} /></Protected>} />
          <Route path="/jobs" element={<Jobs cardProps={cardProps} revision={revision} />} />
          <Route path="/jobs/:id" element={<JobDetails cardProps={cardProps} revision={revision} />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyProfile cardProps={cardProps} />} />
          <Route path="/matcher" element={<Protected role="student"><Dashboard matcher profile={profile.data} cardProps={cardProps} revision={revision} /></Protected>} />
          <Route path="/profile" element={<Protected role="student"><Profile onChanged={onChanged} /></Protected>} />
          <Route path="/employer/jobs" element={<Protected role="employer"><Jobs owned cardProps={cardProps} revision={revision} /></Protected>} />
          <Route path="/employer/jobs/new" element={<Protected role="employer"><JobEditor key="new" onChanged={onChanged} /></Protected>} />
          <Route path="/employer/jobs/:id/edit" element={<Protected role="employer"><JobEditor onChanged={onChanged} /></Protected>} />
          <Route path="/employer/applications" element={<Protected role="employer"><EmployerDashboard /></Protected>} />
          <Route path="/employer/company" element={<Protected role="employer"><EmployerDashboard /></Protected>} />
          <Route path="/employer/analytics" element={<Protected role="employer"><EmployerDashboard /></Protected>} />
          <Route path="/settings" element={<Protected><section className="card form-card"><h1>{t("Make yourself at home")}</h1><label>{t("Language")}</label><LanguageSwitcher /><p>{t("Choose the interface language for the website and dashboards.")}</p><h2>{t("Your account")}</h2><p>{user ? `${user.email} · ${t(user.role)}` : t("You are browsing as a guest.")}</p><p>{t("Your profile and saved jobs stay with your account. For your security, refreshing the page requires you to sign in again.")}</p><SocialLoginButtons linking /></section></Protected>} />
          <Route path="*" element={<section className="card"><h1>{t("Page not found")}</h1><Link to="/dashboard">{t("Return to dashboard")}</Link></section>} />
        </Routes>{dashboardView && <footer>{t("Made for the next generation of Cambodian talent.")}<span>Khmer Job & Skills Matcher</span></footer>}
      </main>
    </div>
    {!dashboardView && <PublicFooter user={user} />}
  </div>
}

function SessionWorkspace() {
  const { sessionKey } = useAuth()
  // A new session gets fresh request state and never sees another account's cached profile.
  return <Workspace key={sessionKey} />
}

function SmartHomeWorkspace() {
  const { t } = useI18n()
  const { signOut, sessionKey } = useAuth()
  const navigate = useNavigate()
  async function logout() { await signOut(); navigate('/login', { replace: true }) }
  return <Suspense fallback={<p role="status" className="card">{t("Loading Smart Home dashboard…")}</p>}><SmartHomeDashboard key={sessionKey} onSignOut={logout} /></Suspense>
}

export function ApplicationRoutes({ initialLanguage } = {}) {
  return <LanguageProvider initialLanguage={initialLanguage}><ThemeToggle /><AuthProvider><RecoveryProvider><Routes>
    <Route path="/oauth/callback" element={<SocialCallback />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/employer-register" element={<EmployerRegister />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/verify-code" element={<VerifyCode />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/smart-home/*" element={<Protected role="admin"><SmartHomeWorkspace /></Protected>} />
    <Route path="*" element={<SessionWorkspace />} />
  </Routes></RecoveryProvider></AuthProvider></LanguageProvider>
}

export default function App() { return <BrowserRouter><ApplicationRoutes /></BrowserRouter> }
