import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser, Profile } from '@/types/auth'
import { toAuthUser } from '@/types/auth'
import {
  fetchProfile,
  onAuthStateChange,
  signIn,
  signOut,
  signUp,
} from '@/services/auth/authService'

// ─────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  /** Re-fetches the profile from the DB and updates the nav chip */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true) // true until session is restored
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate in-flight profile fetches
  const profileFetchRef = useRef<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    if (profileFetchRef.current === userId) return
    profileFetchRef.current = userId
    try {
      const p = await fetchProfile(userId)
      setProfile(p)
    } catch {
      // Profile load failure is non-fatal — user is still authenticated
      setProfile(null)
    } finally {
      profileFetchRef.current = null
    }
  }, [])

  // ── Subscribe to Supabase auth state ──
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const authUser = toAuthUser(session.user)
        setUser(authUser)
        await loadProfile(authUser.id)
      } else {
        setUser(null)
        setProfile(null)
        profileFetchRef.current = null
      }
      setLoading(false)
    })

    return unsubscribe
  }, [loadProfile])

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      await signIn(email, password)
      // onAuthStateChange will fire and update user/profile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err // re-throw so the form can react
    }
  }, [])

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      setError(null)
      try {
        await signUp(email, password, username)
        // Sign in immediately after — Supabase auto-login may not fire for all projects
        await signIn(email, password)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        setError(message)
        throw err
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    setError(null)
    try {
      await signOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const p = await fetchProfile(user.id)
      setProfile(p)
    } catch {
      // Non-fatal
    }
  }, [user])

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, login, register, logout, clearError, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─────────────────────────────────────────────
// Internal hook — use useAuth() in components
// ─────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>')
  }
  return ctx
}
