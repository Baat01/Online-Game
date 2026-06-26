import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'

/**
 * RequireGuest — prevents authenticated users from accessing login/register.
 *
 * While session is being restored → full-page spinner.
 * Authenticated → redirect to home.
 * Unauthenticated → renders child routes (login, register).
 */
export function RequireGuest() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
