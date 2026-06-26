import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { Spade, Home, Users, Gamepad2, Moon, Sun, LogIn, UserPlus, LogOut } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

const navLinks = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/friends', label: 'Friends', icon: Users, end: false },
  { to: '/games', label: 'Games', icon: Gamepad2, end: false },
]

/**
 * Root layout — wraps every page with the top navigation bar.
 * Auth-aware: shows login/register or user menu depending on session.
 */
export function RootLayout() {
  const { isDark, toggleTheme } = useTheme()
  const { user, profile, loading, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast('You have been signed out.', 'info')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-900">
      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-50 border-b border-surface-700 bg-surface-900/80 backdrop-blur-md">
        <nav
          className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <NavLink
            to="/"
            className="flex items-center gap-2 text-slate-100 no-underline font-bold text-lg hover:text-brand-400"
          >
            <Spade className="size-6 text-brand-400 fill-brand-400" aria-hidden="true" />
            CardArena
          </NavLink>

          {/* Nav Links (desktop) */}
          <ul className="hidden sm:flex items-center gap-1 list-none m-0 p-0">
            {navLinks.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-sm font-medium',
                      'transition-colors duration-150 no-underline',
                      isActive
                        ? 'text-brand-400 bg-brand-500/10'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-700',
                    )
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              id="theme-toggle"
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </Button>

            {/* Auth actions */}
            {loading ? (
              <Spinner size="sm" />
            ) : user ? (
              /* Logged-in user chip — clicking goes to /profile */
              <div className="flex items-center gap-2">
                <NavLink
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-btn bg-surface-700 border border-surface-600 no-underline hover:border-brand-500/60 transition-colors"
                  aria-label="View your profile"
                >
                  {/* Avatar circle */}
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-5 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-300 text-xs font-bold"
                    >
                      {(profile?.username ?? user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-slate-200 font-medium max-w-24 truncate">
                    {profile?.username ?? user.email}
                  </span>
                </NavLink>
                <Button
                  id="nav-logout"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="size-3.5" />}
                  aria-label="Sign out"
                >
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            ) : (
              /* Guest buttons */
              <div className="flex items-center gap-1.5">
                <NavLink to="/login" className="no-underline">
                  <Button
                    id="nav-login"
                    variant="ghost"
                    size="sm"
                    leftIcon={<LogIn className="size-3.5" />}
                  >
                    <span className="hidden sm:inline">Sign in</span>
                  </Button>
                </NavLink>
                <NavLink to="/register" className="no-underline">
                  <Button
                    id="nav-register"
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus className="size-3.5" />}
                  >
                    <span className="hidden sm:inline">Register</span>
                  </Button>
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile bottom nav */}
        <nav
          className="sm:hidden flex border-t border-surface-700"
          aria-label="Mobile navigation"
        >
          {navLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium no-underline',
                  'transition-colors duration-150',
                  isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-700 py-4 text-center text-xs text-slate-500">
        CardArena © {new Date().getFullYear()} — Play with friends
      </footer>
    </div>
  )
}
