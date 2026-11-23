import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { GameRoom } from '@/types/lobby'

/**
 * GamesPage integration tests.
 * useLobby and GAME_REGISTRY are mocked.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@test.com' },
    profile: { username: 'testuser', display_name: null, avatar_url: null },
    loading: false,
    error: null,
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const mockCreateRoom = vi.fn()
const mockJoinRoom = vi.fn()
const mockDeleteRoom = vi.fn().mockResolvedValue(undefined)
const mockAccept = vi.fn()
const mockDecline = vi.fn()

const sampleWaitingRoom: GameRoom = {
  id: 'room-public-waiting-1',
  gameSlug: 'blackjack',
  hostId: 'host-other-id',
  state: 'waiting',
  maxPlayers: 6,
  isPublic: true,
  createdAt: '2026-01-01T00:00:00Z',
  startedAt: null,
  metadata: { stakeYen: 0 },
  players: [
    {
      roomId: 'room-public-waiting-1',
      userId: 'host-other-id',
      joinedAt: '2026-01-01T00:00:00Z',
      ready: false,
      profile: {
        id: 'host-other-id',
        username: 'rival_host',
        display_name: 'Rival Host',
        avatar_url: null,
        clan_title: 'Clan Momobami',
      },
    },
  ],
}

const sampleMyActiveRoom: GameRoom = {
  id: 'room-my-playing-1',
  gameSlug: 'blackjack',
  hostId: 'test-user-id',
  state: 'playing',
  maxPlayers: 2,
  isPublic: true,
  createdAt: '2026-01-01T00:00:00Z',
  startedAt: '2026-01-01T00:01:00Z',
  metadata: { stakeYen: 500 },
  players: [
    {
      roomId: 'room-my-playing-1',
      userId: 'test-user-id',
      joinedAt: '2026-01-01T00:00:00Z',
      ready: true,
      profile: { id: 'test-user-id', username: 'testuser', display_name: 'Test User', avatar_url: null },
    },
  ],
}

vi.mock('@/hooks/useLobby', () => ({
  useLobby: () => ({
    games: [],
    invites: [],
    publicRooms: [sampleWaitingRoom],
    myActiveRooms: [sampleMyActiveRoom],
    isGamesLoading: false,
    isInvitesLoading: false,
    isRoomsLoading: false,
    isCreatingRoom: false,
    createRoom: mockCreateRoom,
    joinRoom: mockJoinRoom,
    deleteRoom: mockDeleteRoom,
    accept: mockAccept,
    decline: mockDecline,
  }),
  lobbyKeys: {
    all: ['lobby'],
    games: () => ['lobby', 'games'],
    room: (id: string) => ['lobby', 'room', id],
    publicRooms: () => ['lobby', 'public-rooms'],
    myActiveRooms: (id: string) => ['lobby', 'my-active-rooms', id],
    invites: (id: string) => ['lobby', 'invites', id],
    outgoingInvites: (id: string) => ['lobby', 'outgoing-invites', id],
  },
  useGames: vi.fn(),
  useRoom: vi.fn(),
  usePublicRooms: vi.fn(),
  useInvites: vi.fn(),
  useOutgoingInvites: vi.fn(),
}))

vi.mock('@/games/registry', () => ({
  GAME_REGISTRY: [
    {
      id: 'blackjack',
      slug: 'blackjack',
      name: 'Blackjack',
      description: 'Classic card game',
      icon: () => null,
      minPlayers: 2,
      maxPlayers: 6,
      isAvailable: true,
    },
  ],
  getGameBySlug: vi.fn(),
}))

import { GamesPage } from '@/pages/GamesPage'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <GamesPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GamesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /games/i })).toBeInTheDocument()
  })

  it('renders the Blackjack game card', () => {
    renderPage()
    expect(screen.getAllByText('Blackjack').length).toBeGreaterThan(0)
  })

  it('renders the Create Room button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument()
  })

  it('does not show invitation center when no invites', () => {
    renderPage()
    expect(screen.queryByRole('region', { name: /pending invitation/i })).not.toBeInTheDocument()
  })

  it('shows active match resume banner and public waiting rooms', () => {
    renderPage()
    expect(screen.getByTestId('my-active-rooms-banner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reprendre la partie en cours/i })).toBeInTheDocument()
    expect(screen.getByTestId('public-rooms-section')).toBeInTheDocument()
    expect(screen.getByText('Rival Host')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^rejoindre$/i })).toBeInTheDocument()
  })

  it('opens GameRulesModal from a GameCard Règles button', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /règles de blackjack/i }))
    expect(screen.getByTestId('game-rules-modal')).toBeInTheDocument()
    expect(screen.getByText(/valeur des cartes/i)).toBeInTheDocument()
  })

  it('allows host to delete their own active room directly from GamesPage', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /supprimer le salon room-my-playing-1/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }))
    expect(mockDeleteRoom).toHaveBeenCalledWith('room-my-playing-1')
  })
})
