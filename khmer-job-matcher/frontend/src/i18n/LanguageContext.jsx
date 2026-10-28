import { useCallback, useEffect, useMemo, useState } from 'react'
import { languages, localeFor, translate, validLanguage } from './core.js'
import { LanguageContext } from './context.js'
import { useI18n } from './useI18n.js'
import './language.css'

const KEY = 'kjm-language'

function savedLanguage() {
  try { const value = JSON.parse(localStorage.getItem(KEY)); return validLanguage(value) ? value : 'en' } catch { return 'en' }
}

export function LanguageProvider({ children, initialLanguage }) {
  const [language, updateLanguage] = useState(() => validLanguage(initialLanguage) ? initialLanguage : savedLanguage())
  const [storageError, setStorageError] = useState('')
  const setLanguage = useCallback(next => {
    if (!validLanguage(next)) return
    updateLanguage(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)); setStorageError('') }
    catch { setStorageError('Browser storage is unavailable. Changes last only for this session.') }
  }, [])
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language
    document.documentElement.dataset.language = language
    document.documentElement.dir = 'ltr'
    function sync(event) {
      if (event.key !== KEY) return
      try { const next = JSON.parse(event.newValue); updateLanguage(validLanguage(next) ? next : 'en') } catch { updateLanguage('en') }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [language])
  const value = useMemo(() => ({ language, setLanguage, storageError, locale: localeFor(language),
    t: (key, values) => translate(language, key, values) }), [language, setLanguage, storageError])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function LanguageSwitcher({ compact = false, id }) {
  const { language, setLanguage, t, storageError } = useI18n()
  return <div className={`language-control${compact ? ' is-compact' : ''}`}>
    <label className="language-switcher"><span aria-hidden="true">◎</span><span className="sr-only">{t('Language')}</span>
      <select id={id} aria-label={t('Language')} value={language} onChange={event => setLanguage(event.target.value)}>
        {languages.map(item => <option value={item.code} key={item.code} lang={item.code}>{item.name}</option>)}
      </select>
    </label>{storageError && <span className="language-storage-note" role="status">{t(storageError)}</span>}
  </div>
}
