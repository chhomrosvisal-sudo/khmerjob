// All employers and roles are fictional demonstration data.
export const initialProfile = { name: 'Sokha', education: 'Computer Science student', interests: 'Web development', skills: ['HTML', 'CSS', 'JavaScript', 'React'] }
export const jobs = [
  { id: 1, title: 'Junior Frontend Developer', company: 'Mekong Digital Studio', location: 'Phnom Penh', type: 'Full-time', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Git'], description: 'Build accessible interfaces and turn design ideas into responsive web pages with a small product team.' },
  { id: 2, title: 'Web Development Intern', company: 'Lotus Learning Lab', location: 'Siem Reap', type: 'Internship', skills: ['HTML', 'CSS', 'JavaScript'], description: 'Learn alongside a mentor while maintaining educational websites and testing mobile experiences.' },
  { id: 3, title: 'Junior Data Analyst', company: 'Tonle Insights', location: 'Phnom Penh', type: 'Full-time', skills: ['Python', 'SQL', 'Excel'], description: 'Clean demonstration datasets, prepare reports, and explain findings to a research team.' },
  { id: 4, title: 'React Developer Intern', company: 'Palm Creative', location: 'Remote', type: 'Internship', skills: ['React', 'JavaScript', 'Git', 'TypeScript'], description: 'Build reusable React components, document changes, and learn team development practices.' },
]
export function match(job, skills) {
  const normalized = new Set(skills.map(s => s.trim().toLowerCase()))
  const matched = job.skills.filter(s => normalized.has(s.toLowerCase()))
  return { matched, missing: job.skills.filter(s => !normalized.has(s.toLowerCase())), score: job.skills.length ? Math.round(matched.length / job.skills.length * 100) : 0 }
}
