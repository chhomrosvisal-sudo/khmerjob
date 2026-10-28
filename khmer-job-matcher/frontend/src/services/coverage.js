// Interim skill coverage only. ML ranking is a later milestone.
export function coverage(job, skills = []) {
  const ids = new Set(skills.map(skill => skill.id))
  const required = job.requirements.filter(item => item.required)
  const matched = required.filter(item => ids.has(item.skill.id)).map(item => item.skill.name)
  const missing = required.filter(item => !ids.has(item.skill.id)).map(item => item.skill.name)
  return { matched, missing, score: required.length ? Math.round(matched.length / required.length * 100) : 0 }
}
