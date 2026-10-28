import { createContext } from 'react'
import { translate } from './core.js'

export const LanguageContext = createContext({ language: 'en', locale: 'en-US',
  t: (key, values) => translate('en', key, values), setLanguage: () => {}, storageError: '' })
