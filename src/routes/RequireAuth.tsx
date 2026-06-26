import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'

/**
 * RequireAuth — protects routes that need an authenticated user.
 *
 * While session is being restored → full-page spinner (prevents flash of redirect).
 * Unauthenticated → redirects to /login.
 * Authenticated → renders child routes via <Outlet />.
 */
export function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
