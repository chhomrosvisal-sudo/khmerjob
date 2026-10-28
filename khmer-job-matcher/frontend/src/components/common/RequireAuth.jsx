import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../services/auth-navigation'

export default function RequireAuth({ role, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    const next = location.pathname + location.search + location.hash
    return <Navigate to={'/login?' + new URLSearchParams({ next })} replace />
  }
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />
  return children
}
