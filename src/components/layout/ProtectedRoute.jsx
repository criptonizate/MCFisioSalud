import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import { ROLES } from '../../constants'

export function RequireAdmin({ children }) {
  const { user, userData, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to={`/auth/login?redirect=${location.pathname}`} replace />
  if (userData?.rol !== ROLES.ADMIN) return <Navigate to="/paciente" replace />
  return children
}

export function RequirePaciente({ children }) {
  const { user, userData, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to={`/auth/login?redirect=${location.pathname}`} replace />
  if (userData?.rol === ROLES.ADMIN) return <Navigate to="/admin" replace />
  return children
}
