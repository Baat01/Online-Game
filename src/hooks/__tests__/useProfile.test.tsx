import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * useProfile hook tests.
 * Supabase client, profileService, and useAuth are mocked.
 */

// ── Mock Supabase ─────────────────────────────────────────────────────────────
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

// ── Mock profile service ──────────────────────────────────────────────────────
const mockGetProfile = vi.fn()
const mockUpdateProfile = vi.fn()
const mockUploadAvatar = vi.fn()
const mockRemoveAvatar = vi.fn()
const mockIsUsernameAvailable = vi.fn()

vi.mock('@/services/profile/profileService', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
  removeAvatar: (...args: unknown[]) => mockRemoveAvatar(...args),
  isUsernameAvailable: (...args: unknown[]) => mockIsUsernameAvailable(...args),
}))

// ── Mock useAuth ──────────────────────────────────────────────────────────────
const mockRefreshProfile = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'player@test.com' },
    refreshProfile: mockRefreshProfile,
  }),
}))

import { useProfile } from '../useProfile'

// ─────────────────────────────────────────────────────────────────────────────

const fakeProfile = {
  id: 'user-1',
  username: 'ace',
  display_name: 'Ace',
  bio: 'Hello',
  avatar_url: null,
  is_online: false,
  last_seen: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRefreshProfile.mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────

describe('useProfile', () => {
  it('loads profile via React Query', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile)

    const { result } = renderHook(() => useProfile(), { wrapper: makeWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.profile).toEqual(fakeProfile)
    expect(mockGetProfile).toHaveBeenCalledWith('user-1')
  })

  it('applies optimistic update before server response', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile)

    // Make updateProfile never resolve immediately (slow network)
    let resolveUpdate!: () => void
    mockUpdateProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = () => resolve(fakeProfile)
      }),
    )

    const { result } = renderHook(() => useProfile(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const payload = { username: 'newname', display_name: 'New', bio: 'Bio' }

    // Start mutation — don't await
    act(() => {
      void result.current.updateProfile(payload)
    })

    // Optimistic update should be applied immediately
    await waitFor(() => {
      expect(result.current.profile?.username).toBe('newname')
    })

    // Now resolve
    resolveUpdate()
    await waitFor(() => expect(result.current.isSaving).toBe(false))
    expect(mockRefreshProfile).toHaveBeenCalled()
  })

  it('rolls back optimistic update on failure', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile)
    mockUpdateProfile.mockRejectedValue(new Error('Save failed'))

    const { result } = renderHook(() => useProfile(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const payload = { username: 'failname', display_name: null, bio: null }

    await act(async () => {
      await result.current.updateProfile(payload).catch(() => {})
    })

    // Profile should roll back to original
    await waitFor(() => {
      expect(result.current.profile?.username).toBe('ace')
    })
  })
})
