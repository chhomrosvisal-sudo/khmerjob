import { useI18n } from '../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { Code2, Landmark, Calculator, Megaphone, Users, HardHat, GraduationCap, HeartPulse, Palette, Headphones, ArrowUpRight } from 'lucide-react'
import { categories, categoryFor } from '../../services/catalog'

const icons = [Code2, Landmark, Calculator, Megaphone, Users, HardHat, GraduationCap, HeartPulse, Palette, Headphones]

export default function CategoryGrid({ jobs }) {
  const { t } = useI18n()
  const counts = new Map()
  jobs.forEach(job => { const id = categoryFor(job).id; counts.set(id, (counts.get(id) || 0) + 1) })
  return <section id="categories" className="portal-section categories-section"><div className="portal-section-title"><div><span className="portal-kicker">{t("FIND YOUR FIELD")}</span><h2>{t("Popular Job Categories")}</h2></div><Link to="/jobs">{t("Browse all jobs ")}<ArrowUpRight size={15} /></Link></div><p className="portal-section-description">{t("Start with your interests. Category suggestions are based on job titles and skills.")}</p><div className="category-grid">{categories.map((category, index) => {
    const Icon = icons[index]
    const count = counts.get(category.id) || 0
    return <Link key={category.id} to={'/jobs?category=' + category.id}><span className="category-icon"><Icon size={23} strokeWidth={1.6} /></span><strong>{t(category.name)}</strong><span>{count} {count === 1 ? t("opportunity") : t("opportunities")}</span><ArrowUpRight size={15} className="category-arrow" /></Link>
  })}</div></section>
}
