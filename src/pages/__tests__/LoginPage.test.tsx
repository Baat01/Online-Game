import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * LoginPage tests.
 * Supabase client, useAuth, and toast are mocked.
 */

// ── Mock supabase (prevents transitive import errors) ────────────────────────
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  },
}))

// ── Mock useAuth ─────────────────────────────────────────────────────────────
vi.mock('@/hooks/useAuth')
import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

// ── Mock useToast ────────────────────────────────────────────────────────────
vi.mock('@/components/ui/Toast', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/ui/Toast')>()
  return { ...mod, useToast: () => ({ toast: vi.fn() }) }
})

// ── Mock useNavigate ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

import { LoginPage } from '../LoginPage'

const mockLogin = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({
    user: null, profile: null, loading: false, error: null,
    login: mockLogin, register: vi.fn(), logout: vi.fn(), clearError: vi.fn(), refreshProfile: vi.fn(),
  })
})

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLoginPage()

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitted empty', async () => {
    renderLoginPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows email format error for invalid email', async () => {
    renderLoginPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email address/i), 'notanemail')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()
    })
  })

  it('calls login() with correct values on valid submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLoginPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email address/i), 'player@test.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('player@test.com', 'password123')
    })
  })

  it('navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLoginPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email address/i), 'player@test.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows API error message when login throws', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid login credentials'))
    renderLoginPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email address/i), 'player@test.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials')
    })
  })

  it('disables submit button while request is in flight', async () => {
    mockLogin.mockReturnValue(new Promise(() => {})) // never resolves
    renderLoginPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email address/i), 'player@test.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      // When loading, Button renders a Spinner (role=status) and is disabled
      const submitBtn = screen.getByRole('button', { name: /loading/i })
      expect(submitBtn).toBeDisabled()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
