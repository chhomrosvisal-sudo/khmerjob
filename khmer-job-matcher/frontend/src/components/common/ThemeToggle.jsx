import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useI18n } from '../../i18n/useI18n'
import '../../theme.css'

const storageKey = 'khmer-job-theme'

function initialTheme() {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Theme switching still works when storage is unavailable. */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(initialTheme)
  const { t } = useI18n()
  const dark = theme === 'dark'
  const label = t(dark ? 'Switch to light mode' : 'Switch to night mode')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(storageKey, theme) } catch { /* Keep the in-memory preference. */ }
  }, [theme])

  return <button type="button" className="theme-toggle" aria-label={label} title={label}
    aria-pressed={dark} onClick={() => setTheme(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={19} /> : <Moon size={19} />}
    <span>{t(dark ? 'Light mode' : 'Night mode')}</span>
  </button>
}
