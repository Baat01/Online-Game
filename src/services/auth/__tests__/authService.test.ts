import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Auth service tests.
 * vi.hoisted ensures the mock factory runs before module imports are resolved.
 */

// ── Mock supabase client (hoisted so vi.mock factory can reference it) ──────
const { mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  }
  return { mockAuth }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mockAuth,
    from: vi.fn(),
  },
}))

// Import AFTER mock is registered
import * as authService from '../authService'

// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getSession ───────────────────────────────────────────────────────────────

describe('getSession', () => {
  it('returns session when one exists', async () => {
    const fakeSession = { access_token: 'abc', user: { id: '1', email: 'a@b.com' } }
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null })

    const session = await authService.getSession()
    expect(session).toEqual(fakeSession)
  })

  it('returns null when no session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const session = await authService.getSession()
    expect(session).toBeNull()
  })

  it('throws on Supabase error', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Network error'),
    })

    await expect(authService.getSession()).rejects.toThrow('Network error')
  })
})

// ── signIn ───────────────────────────────────────────────────────────────────

describe('signIn', () => {
  it('calls signInWithPassword with correct credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })

    await authService.signIn('user@test.com', 'password123')

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    })
  })

  it('throws when Supabase returns an error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: new Error('Invalid login credentials'),
    })

    await expect(authService.signIn('user@test.com', 'wrongpass')).rejects.toThrow(
      'Invalid login credentials',
    )
  })
})

// ── signUp ───────────────────────────────────────────────────────────────────

describe('signUp', () => {
  it('calls signUp with email, password, and username in metadata', async () => {
    mockAuth.signUp.mockResolvedValue({ error: null })

    await authService.signUp('new@test.com', 'secret123', 'player1')

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'secret123',
      options: { data: { username: 'player1' } },
    })
  })

  it('throws when email already taken', async () => {
    mockAuth.signUp.mockResolvedValue({
      error: new Error('User already registered'),
    })

    await expect(authService.signUp('existing@test.com', 'pass', 'user')).rejects.toThrow(
      'User already registered',
    )
  })
})

// ── signOut ──────────────────────────────────────────────────────────────────

describe('signOut', () => {
  it('calls signOut with global scope', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null })

    await authService.signOut()

    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('throws on Supabase error', async () => {
    mockAuth.signOut.mockResolvedValue({ error: new Error('Sign out failed') })

    await expect(authService.signOut()).rejects.toThrow('Sign out failed')
  })
})
