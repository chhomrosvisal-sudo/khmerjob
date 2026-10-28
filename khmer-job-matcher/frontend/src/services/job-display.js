import { localeFor, translate } from '../i18n/core.js'

export function salaryLabel(job, language = 'en') {
  const t = (key, values) => translate(language, key, values)
  const amount = value => '$' + Number(value).toLocaleString(localeFor(language))
  if (job.salary_min != null && job.salary_max != null) return t('{range} / month', { range: `${amount(job.salary_min)}–${amount(job.salary_max)}` })
  if (job.salary_min != null) return t('From {amount} / month', { amount: amount(job.salary_min) })
  if (job.salary_max != null) return t('Up to {amount} / month', { amount: amount(job.salary_max) })
  return t('Salary not disclosed')
}

export function postedLabel(value, language = 'en') {
  if (!value || !Number.isFinite(new Date(value).getTime())) return translate(language, 'Posting date not provided')
  return translate(language, 'Posted {date}', { date: new Date(value).toLocaleDateString(localeFor(language)) })
}
