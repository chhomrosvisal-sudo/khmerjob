import { messages } from './messages.js'
const caseInsensitive = Object.fromEntries(Object.entries(messages).map(([key, value]) => [key.toLowerCase(), value]))

export const languages = [
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'km', name: 'ខ្មែរ', locale: 'km-KH' },
  { code: 'zh', name: '简体中文', locale: 'zh-CN' },
]
export const validLanguage = value => languages.some(language => language.code === value)
export const localeFor = language => languages.find(item => item.code === language)?.locale || 'en-US'

export function translate(language, key, values = {}) {
  if (typeof key !== 'string' || !key) return key
  const normalized = key.replace(/\s+/g, ' ').trim()
  const entry = Object.hasOwn(messages, normalized) ? messages[normalized] : caseInsensitive[normalized.toLowerCase()]
  const message = (language === 'en' ? normalized : entry?.[language]) || normalized
  const result = message.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match)
  // Keep deliberate inline spacing when translating a fragment next to an icon or value.
  return (key.startsWith(' ') ? ' ' : '') + result + (key.endsWith(' ') ? ' ' : '')
}
