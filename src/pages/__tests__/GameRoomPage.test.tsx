import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { GameRoom } from '@/types/lobby'

/**
 * GameRoomPage integration tests.
 * useRoom, useLobby, usePresence are mocked.
 */

// ── IDs ───────────────────────────────────────────────────────────────────────

const ROOM_ID    = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const HOST_ID    = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
const PLAYER_ID  = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'

const mockRoom: GameRoom = {
  id: ROOM_ID,
  gameSlug: 'blackjack',
  hostId: HOST_ID,
  state: 'waiting',
  maxPlayers: 6,
  createdAt: '2024-01-01T00:00:00Z',
  startedAt: null,
  players: [
    {
      roomId: ROOM_ID,
      userId: HOST_ID,
      joinedAt: '2024-01-01T00:00:00Z',
      ready: false,
      profile: { id: HOST_ID, username: 'host', display_name: 'Host User', avatar_url: null },
    },
    {
      roomId: ROOM_ID,
      userId: PLAYER_ID,
      joinedAt: '2024-01-01T00:00:10Z',
      ready: true,
      profile: { id: PLAYER_ID, username: 'player2', display_name: null, avatar_url: null },
    },
  ],
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: HOST_ID, email: 'host@test.com' },
    profile: { username: 'host', display_name: 'Host User', avatar_url: null },
    loading: false,
  }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({ isOnline: () => false, lastSeen: () => null, isLoading: false }),
  presenceKeys: { all: ['presence'], list: (s: string) => ['presence', 'list', s] },
}))

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ friends: [], isLoading: false }),
  friendKeys: {
    all: ['friends'],
    lists: () => ['friends', 'list'],
    friends: (id: string) => ['friends', 'list', 'friends', id],
    incoming: (id: string) => ['friends', 'list', 'incoming', id],
    outgoing: (id: string) => ['friends', 'list', 'outgoing', id],
  },
}))

const mockSetReady = vi.fn()
const mockLaunch = vi.fn()
const mockLeave = vi.fn()
const mockKick = vi.fn()
const mockInvite = vi.fn()

vi.mock('@/hooks/useLobby', () => ({
  useRoom: vi.fn(() => ({ data: mockRoom, isLoading: false, error: null })),
  useOutgoingInvites: vi.fn(() => ({ data: [] })),
  useLobby: () => ({
    games: [],
    invites: [],
    isGamesLoading: false,
    isInvitesLoading: false,
    isCreatingRoom: false,
    createRoom: vi.fn(),
    setReady: mockSetReady,
    launchGame: mockLaunch,
    leaveRoom: mockLeave,
    kickPlayer: mockKick,
    invite: mockInvite,
    accept: vi.fn(),
    decline: vi.fn(),
    cancelInvite: vi.fn(),
  }),
  lobbyKeys: {
    all: ['lobby'],
    games: () => ['lobby', 'games'],
    room: (id: string) => ['lobby', 'room', id],
    invites: (id: string) => ['lobby', 'invites', id],
    outgoingInvites: (id: string) => ['lobby', 'outgoing-invites', id],
  },
}))

vi.mock('@/games/registry', () => ({
  getGameBySlug: () => ({
    id: 'blackjack',
    slug: 'blackjack',
    name: 'Blackjack',
    icon: () => null,
    minPlayers: 2,
    maxPlayers: 6,
    isAvailable: true,
  }),
}))

import { GameRoomPage } from '@/pages/GameRoomPage'

function renderPage(roomId = ROOM_ID) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[`/room/${roomId}`]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/room/:roomId" element={<GameRoomPage />} />
          <Route path="/games" element={<div>Games Page</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GameRoomPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the room header with Blackjack', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Blackjack')).toBeInTheDocument()
    })
  })

  it('renders all players', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Host User')).toBeInTheDocument()
      expect(screen.getByText('@player2')).toBeInTheDocument()
    })
  })

  it('shows Host badge for the host', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /room host/i })).toBeInTheDocument()
    })
  })

  it('renders the Ready toggle', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark as ready/i })).toBeInTheDocument()
    })
  })

  it('renders Invite Friends button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite friends/i })).toBeInTheDocument()
    })
  })

  it('shows Dissolve Room button for the host', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /dissolve room/i })).toBeInTheDocument()
    })
  })

  it('does NOT show Launch button when state is waiting', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /launch game/i })).not.toBeInTheDocument()
    })
  })

  it('shows loading skeleton when room is loading', async () => {
    const { useRoom } = await import('@/hooks/useLobby')
    ;(useRoom as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: null, isLoading: true, error: null })
    renderPage()
    // Skeleton should be visible (no heading)
    expect(screen.queryByText('Blackjack')).not.toBeInTheDocument()
  })
})
