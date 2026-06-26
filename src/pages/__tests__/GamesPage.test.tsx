import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

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
const mockAccept = vi.fn()
const mockDecline = vi.fn()

vi.mock('@/hooks/useLobby', () => ({
  useLobby: () => ({
    games: [],
    invites: [],
    isGamesLoading: false,
    isInvitesLoading: false,
    isCreatingRoom: false,
    createRoom: mockCreateRoom,
    accept: mockAccept,
    decline: mockDecline,
  }),
  lobbyKeys: {
    all: ['lobby'],
    games: () => ['lobby', 'games'],
    room: (id: string) => ['lobby', 'room', id],
    invites: (id: string) => ['lobby', 'invites', id],
    outgoingInvites: (id: string) => ['lobby', 'outgoing-invites', id],
  },
  useGames: vi.fn(),
  useRoom: vi.fn(),
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
    expect(screen.getByText('Blackjack')).toBeInTheDocument()
  })

  it('renders the Create Room button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument()
  })

  it('does not show invitation center when no invites', () => {
    renderPage()
    expect(screen.queryByRole('region', { name: /pending invitation/i })).not.toBeInTheDocument()
  })
})
