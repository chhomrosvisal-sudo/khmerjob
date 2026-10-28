import { useI18n } from '../../i18n/useI18n'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, BriefcaseBusiness, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { categories } from '../../services/catalog'

const slides = [
  { tag: 'YOUR NEXT CHAPTER STARTS HERE', title: 'Find Your Dream Job in Cambodia', text: 'Discover opportunities, match your skills, and build your future career.' },
  { tag: 'BIG POTENTIAL. NEW POSSIBILITIES.', title: 'Turn Your Skills Into Opportunities', text: 'Discover what you already know and the skills to learn for your next role.' },
  { tag: 'MAKE YOUR FIRST MOVE', title: 'Start Your Career With Confidence', text: 'Explore internships and early-career opportunities across Cambodia.' },
]

export default function HeroSearch() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setSlide(value => (value + 1) % slides.length), 6500)
    return () => clearInterval(timer)
  }, [playing])
  function search(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params = new URLSearchParams()
    for (const key of ['q', 'category', 'location']) if (data.get(key)?.trim()) params.set(key, data.get(key).trim())
    navigate('/jobs?' + params)
  }
  return <section className="portal-hero" aria-roledescription="carousel" aria-label={t("Career opportunities")}>
    <img className="portal-hero-image" src="/images/cambodia-office-hero.png" alt="" fetchPriority="high" />
    <div className="portal-hero-shade" />
    <div className="portal-container hero-content">
      <div className="hero-slide" key={slide} aria-live={playing ? 'off' : 'polite'}><span className="hero-kicker"><span />{t(slides[slide].tag)}</span><h1>{t(slides[slide].title)}</h1><p>{t(slides[slide].text)}</p></div>
      <form className="hero-search" onSubmit={search} aria-label={t("Find jobs")}>
        <label><Search size={20} /><span className="sr-only">{t("Job title, company, or keywords")}</span><input name="q" placeholder={t("Job title, company, or keywords")} /></label>
        <label><BriefcaseBusiness size={18} /><span className="sr-only">{t("Job function")}</span><select name="category" defaultValue=""><option value="">{t("All job functions")}</option>{categories.map(category => <option key={category.id} value={category.id}>{t(category.name)}</option>)}</select></label>
        <label><MapPin size={18} /><span className="sr-only">{t("Job location")}</span><select name="location" defaultValue=""><option value="">{t("All locations")}</option>{['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville', 'Kampot', 'Remote'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
        <button type="submit"><Search size={17} />{t("Search Jobs")}</button>
      </form>
      <div className="hero-bottom"><div className="popular-searches"><span>{t("Popular searches:")}</span>{['Developer', 'Intern', 'Analyst'].map(term => <button key={term} onClick={() => navigate('/jobs?q=' + encodeURIComponent(term))}>{t(term)}<ArrowRight size={11} /></button>)}</div>
        <div className="hero-controls"><button onClick={() => setSlide((slide + 2) % 3)} aria-label={t("Previous slide")}><ChevronLeft size={16} /></button>{slides.map((item, index) => <button key={item.tag} className={slide === index ? 'hero-dot selected' : 'hero-dot'} aria-label={t("Show slide {v0}", {v0: index + 1})} aria-pressed={slide === index} onClick={() => setSlide(index)} />)}<button onClick={() => setSlide((slide + 1) % 3)} aria-label={t("Next slide")}><ChevronRight size={16} /></button><button aria-label={playing ? t("Pause carousel") : t("Play carousel")} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={13} /> : <Play size={13} />}</button></div>
      </div>
    </div>
    <span className="hero-image-credit">{t("Original AI-generated illustration")}</span>
  </section>
}
