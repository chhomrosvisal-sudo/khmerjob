import { Navigate, useLocation } from 'react-router-dom'

const routes = {
  '': '/dashboard', dashboard: '/dashboard', students: '/dashboard/students',
  employers: '/dashboard/employers', jobs: '/dashboard/jobs', applications: '/dashboard/applications',
  approvals: '/dashboard/approvals', skills: '/dashboard/skills', 'ai-matching': '/dashboard/matching',
  reports: '/dashboard/reports', notifications: '/dashboard/notifications', settings: '/settings',
}

export default function AdminRouteAlias() {
  const location = useLocation()
  const name = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '')
  const destination = Object.hasOwn(routes, name) ? routes[name] : '/dashboard/' + name
  return <Navigate replace to={destination + location.search + location.hash} />
}
