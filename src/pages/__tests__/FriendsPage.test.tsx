import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * FriendsPage integration test.
 * useFriends is mocked to avoid real Supabase calls.
 */

// ── Mock useFriends ─────────────────────────────────────────────────────────

const mockUseFriends = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useFriends', () => ({
  useFriends: mockUseFriends,
  friendKeys: {
    all: ['friends'],
    lists: () => ['friends', 'list'],
    friends: (id: string) => ['friends', 'list', 'friends', id],
    incoming: (id: string) => ['friends', 'list', 'incoming', id],
    outgoing: (id: string) => ['friends', 'list', 'outgoing', id],
  },
}))

// ── Mock useAuth ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com' },
    profile: { username: 'testuser', display_name: null, avatar_url: null },
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}))

// ── Mock useToast ─────────────────────────────────────────────────────────────

const mockToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// ─────────────────────────────────────────────────────────────────────────────

import { FriendsPage } from '@/pages/FriendsPage'
import type { Friend, FriendRequest } from '@/types/friends'

const makeFriend = (id: string): Friend => ({
  id,
  userId: 'user-1',
  friendId: `friend-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  profile: { id: `friend-${id}`, username: `user_${id}`, display_name: null, avatar_url: null },
})

const makeRequest = (id: string, direction: 'in' | 'out'): FriendRequest => ({
  id,
  senderId: direction === 'in' ? `sender-${id}` : 'user-1',
  receiverId: direction === 'out' ? `receiver-${id}` : 'user-1',
  status: 'pending',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  sender:
    direction === 'in'
      ? { id: `sender-${id}`, username: `sender_${id}`, display_name: null, avatar_url: null }
      : undefined,
  receiver:
    direction === 'out'
      ? {
          id: `receiver-${id}`,
          username: `receiver_${id}`,
          display_name: null,
          avatar_url: null,
        }
      : undefined,
})

function defaultHookReturn(overrides = {}) {
  return {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    searchResults: [],
    isLoading: false,
    isSearching: false,
    isMutating: false,
    sendRequest: vi.fn().mockResolvedValue({}),
    accept: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(undefined),
    clearSearch: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  }
}

function renderPage(initialPath = '/friends') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/friends', element: <FriendsPage /> }],
    { initialEntries: [initialPath] },
  )

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('FriendsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFriends.mockReturnValue(defaultHookReturn())
  })

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the page title and tab bar', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /friends/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /friends/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /requests/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /discover/i })).toBeInTheDocument()
  })

  it('shows empty state when no friends', () => {
    renderPage()
    expect(screen.getByText(/no friends yet/i)).toBeInTheDocument()
  })

  it('renders a friend card when friends exist', () => {
    mockUseFriends.mockReturnValue(defaultHookReturn({ friends: [makeFriend('1')] }))
    renderPage()
    expect(screen.getByText('user_1')).toBeInTheDocument()
  })

  // ── Tab navigation ─────────────────────────────────────────────────────────

  it('switches to Requests tab when clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: /requests/i }))
    expect(screen.getByRole('tabpanel', { name: /requests/i })).toBeVisible()
  })

  it('switches to Discover tab when clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: /discover/i }))
    expect(screen.getByRole('searchbox', { name: /search users/i })).toBeVisible()
  })

  it('reads tab from URL ?tab= param', () => {
    renderPage('/friends?tab=requests')
    const requestsPanel = screen.getByRole('tabpanel', { name: /requests/i })
    expect(requestsPanel).not.toHaveAttribute('hidden')
  })

  // ── Requests tab ───────────────────────────────────────────────────────────

  it('shows incoming request with accept/reject buttons', async () => {
    mockUseFriends.mockReturnValue(
      defaultHookReturn({ incomingRequests: [makeRequest('r1', 'in')] }),
    )
    renderPage('/friends?tab=requests')

    expect(screen.getByRole('button', { name: /accept friend request from sender_r1/i }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject friend request from sender_r1/i }))
      .toBeInTheDocument()
  })

  it('calls accept and shows success toast', async () => {
    const mockAccept = vi.fn().mockResolvedValue(undefined)
    mockUseFriends.mockReturnValue(
      defaultHookReturn({
        incomingRequests: [makeRequest('r1', 'in')],
        accept: mockAccept,
      }),
    )
    renderPage('/friends?tab=requests')

    await userEvent.click(
      screen.getByRole('button', { name: /accept friend request from sender_r1/i }),
    )

    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith('r1')
      expect(mockToast).toHaveBeenCalledWith('Friend request accepted!', 'success')
    })
  })

  it('shows error toast when accept fails', async () => {
    const mockAccept = vi.fn().mockRejectedValue(new Error('fail'))
    mockUseFriends.mockReturnValue(
      defaultHookReturn({
        incomingRequests: [makeRequest('r1', 'in')],
        accept: mockAccept,
      }),
    )
    renderPage('/friends?tab=requests')

    await userEvent.click(
      screen.getByRole('button', { name: /accept friend request from sender_r1/i }),
    )

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Failed to accept request.', 'error')
    })
  })

  // ── Remove friend ──────────────────────────────────────────────────────────

  it('calls remove and shows toast when Remove button clicked', async () => {
    const mockRemove = vi.fn().mockResolvedValue(undefined)
    mockUseFriends.mockReturnValue(
      defaultHookReturn({ friends: [makeFriend('1')], remove: mockRemove }),
    )
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /remove user_1 from friends/i }))

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith('friend-1')
      expect(mockToast).toHaveBeenCalledWith('Friend removed.', 'info')
    })
  })

  // ── Discover tab ───────────────────────────────────────────────────────────

  it('renders search results in Discover tab', () => {
    mockUseFriends.mockReturnValue(
      defaultHookReturn({
        searchResults: [
          {
            id: 'res-1',
            username: 'newplayer',
            display_name: null,
            avatar_url: null,
            relationship: 'none',
          },
        ],
      }),
    )
    renderPage('/friends?tab=discover')

    expect(screen.getByText('newplayer')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send friend request to newplayer/i }),
    ).toBeInTheDocument()
  })

  it('hides Add button for users already friends', () => {
    mockUseFriends.mockReturnValue(
      defaultHookReturn({
        searchResults: [
          {
            id: 'res-1',
            username: 'alreadyfriend',
            display_name: null,
            avatar_url: null,
            relationship: 'friend',
          },
        ],
      }),
    )
    renderPage('/friends?tab=discover')

    expect(
      screen.queryByRole('button', { name: /send friend request/i }),
    ).not.toBeInTheDocument()
  })
})
