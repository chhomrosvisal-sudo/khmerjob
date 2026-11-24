import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../services/auth-navigation'

export default function RequireAuth({ role, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    const next = location.pathname + location.search + location.hash
    const params = new URLSearchParams({ next })
    const login = role === 'admin' || role === 'employer' ? '/workspace-login' : '/login'
    return <Navigate to={login + '?' + params} replace />
  }
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />
  return children
}
