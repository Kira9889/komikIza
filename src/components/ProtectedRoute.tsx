import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'

export default function ProtectedRoute({
  role,
  children,
  redirectTo = '/login',
}: {
  role?: UserRole
  children: React.ReactNode
  redirectTo?: string
}) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
  }
  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}