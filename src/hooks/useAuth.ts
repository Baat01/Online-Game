import { useAuthContext } from '@/contexts/AuthContext'

/**
 * Primary auth hook for all components and pages.
 *
 * Usage:
 *   const { user, profile, loading, login, register, logout } = useAuth()
 */
export function useAuth() {
  return useAuthContext()
}
