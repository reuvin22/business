import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { loginPath, nextPath } from './utils/nextPath'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>
  // After signing in, come back to this exact page (with its ?add=... etc.)
  if (!user) return <Navigate to={loginPath(location.pathname + location.search)} replace />
  return children
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>
  if (user) return <Navigate to={nextPath(location.search)} replace />
  return children
}
