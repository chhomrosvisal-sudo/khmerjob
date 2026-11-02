import { categoryFor } from '../../services/catalog'

const pictureCounts = {
  technology: 4, banking: 1, accounting: 1, marketing: 2, hr: 1,
  engineering: 1, education: 1, healthcare: 1, design: 2, 'customer-service': 1,
}

export default function JobPicture({ job }) {
  const category = categoryFor(job).id
  const count = pictureCounts[category]
  // Keep the picture consistent across cards, filtering, pagination, and details.
  const variant = Math.abs(Number(job.id) || 0) % (count || 1) + 1
  const suffix = variant === 1 ? '' : `-${variant}`
  const picture = count ? `job-hiring-${category}${suffix}.png` : 'job-hiring-team.png'
  return <div className="job-picture" aria-hidden="true">
    <img src={`/images/${picture}`} alt="" loading="lazy" decoding="async" width="1888" height="833" />
  </div>
}
