import { useI18n } from '../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { FileText, Lightbulb, MessagesSquare, ArrowRight, Sparkles } from 'lucide-react'

const advice = [
  [FileText, 'Build a clear first CV', 'Start with what you can do.', 'Keep your CV focused on the role. Add your education, relevant projects, tools you know, and a way to contact you. Describe what you contributed to each project, even if it was a class assignment. Review your spelling and save a readable PDF.'],
  [Lightbulb, 'Make your skills visible', 'Show your work, not just your potential.', 'Choose skills you can demonstrate. A small website, spreadsheet, design portfolio, or volunteer project can give an employer a useful example. Compare your skills with job requirements and choose one missing skill to practise next.'],
  [MessagesSquare, 'Prepare for your interview', 'A little preparation goes a long way.', 'Read the job description and learn about the employer. Prepare a short introduction and specific examples of solving a problem or working with a team. Ask questions about the role, expectations, and learning opportunities. Never pay a recruiter to guarantee a job.'],
]

export default function CareerAdvice() {
  const { t } = useI18n()
  return <><section id="career-advice" className="portal-section career-advice"><div className="portal-section-title"><div><span className="portal-kicker">{t("A LITTLE GUIDANCE GOES A LONG WAY")}</span><h2>{t("Grow Into Your Next Chapter")}</h2></div><span className="portal-subtle">{t("Career advice for your first steps")}</span></div><div className="advice-grid">{advice.map(([Icon, title, subtitle, text], index) => <article key={title}><div className={`advice-art advice-art-${index}`}><Icon size={43} strokeWidth={1.3} /><span>0{index + 1}</span></div><div className="advice-body"><span className="portal-kicker">{t("CAREER TOOLKIT")}</span><h3>{t(title)}</h3><p>{t(subtitle)}</p><details><summary>{t("Read the guide ")}<ArrowRight size={14} /></summary><p>{t(text)}</p></details></div></article>)}</div></section>
    <section className="portal-cta"><div><span><Sparkles size={17} />{t(" YOUR FUTURE IS FULL OF POSSIBILITIES")}</span><h2>{t("Find where you belong.")}</h2><p>{t("Bring your skills. Discover your next opportunity.")}</p></div><Link to="/register">{t("Create your free profile ")}<ArrowRight size={17} /></Link></section></>
}
