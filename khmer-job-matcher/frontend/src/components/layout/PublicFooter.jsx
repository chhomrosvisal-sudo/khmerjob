import { useI18n } from '../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { BriefcaseBusiness, ArrowUpRight, MapPin } from 'lucide-react'

const currentYear = new Date().getFullYear()

export default function PublicFooter({ user }) {
  const { t } = useI18n()
  return <footer className="portal-footer"><div className="portal-container footer-grid">
    <div><Link to="/" className="portal-brand"><span className="portal-logo"><BriefcaseBusiness size={24} /></span><span>Khmer<span>Job</span></span></Link><p>{t("Connecting Cambodian talent with their next opportunity. Your skills. Your future.")}</p><span className="footer-location"><MapPin size={14} />{t(" Built for Cambodia")}</span></div>
    <div><h3>{t("For job seekers")}</h3><Link to="/jobs">{t("Find a job")}</Link><Link to="/register">{t("Create your profile")}</Link><Link to="/account">{t("My account")}</Link><Link to="/account/applications">{t("My applications")}</Link></div>
    <div><h3>{t("Explore")}</h3><Link to="/#employers">{t("Employers")}</Link><Link to="/#categories">{t("Job categories")}</Link><Link to="/#career-advice">{t("Career advice")}</Link>{user?.role === 'admin' && <Link to="/smart-home">{t("Dashboard design demo")}</Link>}</div>
    <div className="footer-invitation"><h3>{t("Your next chapter starts here.")}</h3><p>{t("Take a small step toward something bigger.")}</p><Link to="/register">{t("Join KhmerJob ")}<ArrowUpRight size={15} /></Link></div>
  </div><div className="portal-container footer-bottom"><span>© {currentYear} Khmer Job & Skills Matcher</span><span>{t("Demo vacancies are fictional. No employer is contacted for demo applications.")}</span></div></footer>
}
