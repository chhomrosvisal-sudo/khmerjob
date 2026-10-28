import { useContext } from 'react'
import { LanguageContext } from './context.js'

export function useI18n() { return useContext(LanguageContext) }
