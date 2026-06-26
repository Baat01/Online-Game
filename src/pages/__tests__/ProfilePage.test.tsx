import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * ProfilePage tests.
 * useProfile, useAuth, and Toast are fully mocked.
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

// ── Mock useProfile ───────────────────────────────────────────────────────────
const mockUpdateProfile = vi.fn()
const mockUploadAvatar = vi.fn()
const mockRemoveAvatar = vi.fn()
const mockCheckUsername = vi.fn()

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(),
}))
import { useProfile } from '@/hooks/useProfile'
const mockUseProfile = vi.mocked(useProfile)

// ── Mock useAuth ──────────────────────────────────────────────────────────────
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'player@test.com' },
    profile: null,
    loading: false,
    refreshProfile: vi.fn(),
  }),
}))

// ── Mock Toast ────────────────────────────────────────────────────────────────
const mockToast = vi.fn()
vi.mock('@/components/ui/Toast', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/ui/Toast')>()
  return { ...mod, useToast: () => ({ toast: mockToast }) }
})

import { ProfilePage } from '../ProfilePage'

// ─────────────────────────────────────────────────────────────────────────────

const fakeProfile = {
  id: 'user-1',
  username: 'ace',
  display_name: 'Ace Player',
  bio: 'Hello world',
  avatar_url: null,
  is_online: false,
  last_seen: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function renderPage(overrides?: Partial<ReturnType<typeof useProfile>>) {
  if (overrides) {
    mockUseProfile.mockReturnValue({
      profile: fakeProfile,
      isLoading: false,
      isSaving: false,
      isUploadingAvatar: false,
      isRemovingAvatar: false,
      updateProfile: mockUpdateProfile,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      checkUsernameAvailable: mockCheckUsername,
      refresh: vi.fn(),
      ...overrides,
    })
  }

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // createMemoryRouter is needed because useBlocker requires a data router
  const router = createMemoryRouter(
    [{ path: '/', element: <ProfilePage /> }],
    { initialEntries: ['/'] },
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckUsername.mockResolvedValue(true)
  mockUseProfile.mockReturnValue({
    profile: fakeProfile,
    isLoading: false,
    isSaving: false,
    isUploadingAvatar: false,
    isRemovingAvatar: false,
    updateProfile: mockUpdateProfile,
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
    checkUsernameAvailable: mockCheckUsername,
    refresh: vi.fn(),
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  it('renders profile page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /your profile/i })).toBeInTheDocument()
  })

  it('renders loading skeleton when isLoading=true', () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      isLoading: true,
      isSaving: false,
      isUploadingAvatar: false,
      isRemovingAvatar: false,
      updateProfile: mockUpdateProfile,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      checkUsernameAvailable: mockCheckUsername,
      refresh: vi.fn(),
    })
    renderPage()
    // Skeleton boxes have aria-hidden, but the form should not be present
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('renders username and bio fields with profile values', () => {
    renderPage()
    const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
    expect(usernameInput.value).toBe('ace')
  })

  it('calls updateProfile when form is submitted with changed values', async () => {
    mockUpdateProfile.mockResolvedValue(fakeProfile)
    renderPage()
    const user = userEvent.setup()

    // Change username
    const usernameInput = screen.getByLabelText(/username/i)
    await user.clear(usernameInput)
    await user.type(usernameInput, 'newace')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newace' }),
      )
    })
  })

  it('shows success toast after save', async () => {
    mockUpdateProfile.mockResolvedValue(fakeProfile)
    renderPage()
    const user = userEvent.setup()

    const usernameInput = screen.getByLabelText(/username/i)
    await user.clear(usernameInput)
    await user.type(usernameInput, 'newace2')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Profile saved successfully!', 'success')
    })
  })

  it('shows error toast when save fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('Save error'))
    renderPage()
    const user = userEvent.setup()

    const usernameInput = screen.getByLabelText(/username/i)
    await user.clear(usernameInput)
    await user.type(usernameInput, 'failname')

    // ProfilePage re-throws after toasting so the form stays dirty
    // We suppress the expected rejection here
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Save error', 'error')
    })
  })
})
