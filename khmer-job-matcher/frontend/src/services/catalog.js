// Categories are a transparent title/skill classification until jobs have a curated category field.
export const categories = [
  { id: 'technology', name: 'Information Technology', pattern: /developer|software|\bweb\b|\bdata\b|\bit\b|python|react|javascript|network/i },
  { id: 'banking', name: 'Banking & Finance', pattern: /bank|finance|financial|credit|loan/i },
  { id: 'accounting', name: 'Accounting', pattern: /accountant|accounting|audit|bookkeep/i },
  { id: 'marketing', name: 'Marketing', pattern: /marketing|sales|content|seo/i },
  { id: 'hr', name: 'Human Resources', pattern: /human resources|recruiter|recruitment|\bhr\b/i },
  { id: 'engineering', name: 'Engineering', pattern: /engineer|construction|mechanical|electrical/i },
  { id: 'education', name: 'Education', pattern: /teacher|teaching|tutor|education/i },
  { id: 'healthcare', name: 'Healthcare', pattern: /nurse|medical|healthcare|pharmac|doctor/i },
  { id: 'design', name: 'Design', pattern: /designer|design|creative|figma/i },
  { id: 'customer-service', name: 'Customer Service', pattern: /customer|support|reception|service agent/i },
]

export function categoryFor(job) {
  const curated = categories.find(item => item.id === job.category)
  if (curated) return curated
  const text = `${job.title} ${(job.requirements || []).map(item => item.skill.name).join(' ')}`
  return categories.find(category => category.pattern.test(text)) || { id: 'other', name: 'Other opportunities' }
}

export function groupEmployers(jobs) {
  const grouped = new Map()
  for (const job of jobs) {
    if (!grouped.has(job.employer.id)) grouped.set(job.employer.id, { ...job.employer, count: 0 })
    grouped.get(job.employer.id).count++
  }
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
}

export async function loadCatalog(api, filters = {}, options = {}) {
  // Read every page so employer/category counts and client category pagination are accurate.
  const values = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined))
  let page = 1
  let items = []
  while (true) {
    const result = await api('/api/jobs?' + new URLSearchParams({ ...values, page, page_size: 100 }), options)
    items = items.concat(result.items)
    if (!result.items.length || page * 100 >= result.total) return items
    page++
  }
}
