import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * RequireAuth route guard tests.
 * Supabase client and useAuth are both mocked to avoid any real network calls.
 */

// ── Hoist supabase mock (prevents transitive import errors) ─────────────────
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

// ── Mock useAuth ─────────────────────────────────────────────────────────────
vi.mock('@/hooks/useAuth')
import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

import { RequireAuth } from '../RequireAuth'

// ── Helper ───────────────────────────────────────────────────────────────────
function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RequireAuth', () => {
  it('renders a spinner while loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, profile: null, loading: true, error: null,
      login: vi.fn(), register: vi.fn(), logout: vi.fn(), clearError: vi.fn(), refreshProfile: vi.fn(),
    })

    renderWithRouter()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null, profile: null, loading: false, error: null,
      login: vi.fn(), register: vi.fn(), logout: vi.fn(), clearError: vi.fn(), refreshProfile: vi.fn(),
    })

    renderWithRouter()

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders protected content when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'abc', email: 'user@test.com' },
      profile: null, loading: false, error: null,
      login: vi.fn(), register: vi.fn(), logout: vi.fn(), clearError: vi.fn(), refreshProfile: vi.fn(),
    })

    renderWithRouter()

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
