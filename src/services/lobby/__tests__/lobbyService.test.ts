import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as lobbyService from '../lobbyService'

/**
 * Lobby service unit tests.
 * Supabase client is fully mocked via vi.hoisted.
 */

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { mockFrom, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-uuid-1111-111111111111' } } }),
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: mockAuth,
  },
}))

/** Build a fluent chainable Supabase mock */
function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'order', 'single', 'neq']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve)
  return chain
}

const TEST_ROOM_ID  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TEST_USER_ID  = 'test-user-uuid-1111-111111111111'
const TEST_INVITE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'

// ─────────────────────────────────────────────────────────────────────────────

describe('lobbyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getGames ──────────────────────────────────────────────────────────────

  describe('getGames', () => {
    it('returns mapped GameCatalogEntry array', async () => {
      const mockData = [{
        id: 'catalog-id-1',
        slug: 'blackjack',
        name: 'Blackjack',
        description: 'Classic card game',
        min_players: 2,
        max_players: 6,
        enabled: true,
      }]
      mockFrom.mockReturnValue(buildChain({ data: mockData, error: null }))

      const result = await lobbyService.getGames()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ slug: 'blackjack', minPlayers: 2, maxPlayers: 6 })
    })

    it('throws on Supabase error', async () => {
      mockFrom.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }))
      await expect(lobbyService.getGames()).rejects.toMatchObject({ message: 'DB error' })
    })

    it('returns empty array for null data', async () => {
      mockFrom.mockReturnValue(buildChain({ data: null, error: null }))
      const result = await lobbyService.getGames()
      expect(result).toEqual([])
    })
  })

  // ── createRoom ────────────────────────────────────────────────────────────

  describe('createRoom', () => {
    it('inserts a room and returns GameRoom', async () => {
      const mockRoom = {
        id: TEST_ROOM_ID,
        game_slug: 'blackjack',
        host_id: TEST_USER_ID,
        state: 'waiting',
        max_players: 6,
        created_at: '2024-01-01T00:00:00Z',
        started_at: null,
      }
      mockFrom.mockReturnValue(buildChain({ data: mockRoom, error: null }))

      const result = await lobbyService.createRoom('blackjack', 6)

      expect(result).toMatchObject({
        id: TEST_ROOM_ID,
        gameSlug: 'blackjack',
        hostId: TEST_USER_ID,
        state: 'waiting',
      })
    })

    it('throws ZodError for invalid maxPlayers', async () => {
      await expect(lobbyService.createRoom('blackjack', 1)).rejects.toThrow()
    })
  })

  // ── setReady ──────────────────────────────────────────────────────────────

  describe('setReady', () => {
    it('updates ready field for current user', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await lobbyService.setReady(TEST_ROOM_ID, true)

      expect(mockFrom).toHaveBeenCalledWith('room_players')
      expect(chain.update).toHaveBeenCalledWith({ ready: true })
    })
  })

  // ── inviteFriend ──────────────────────────────────────────────────────────

  describe('inviteFriend', () => {
    it('inserts an invitation and returns GameInvitation', async () => {
      const mockInvite = {
        id: TEST_INVITE_ID,
        sender_id: TEST_USER_ID,
        receiver_id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        game_slug: 'blackjack',
        room_id: TEST_ROOM_ID,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-01T00:05:00Z',
      }
      mockFrom.mockReturnValue(buildChain({ data: mockInvite, error: null }))

      const result = await lobbyService.inviteFriend(
        TEST_ROOM_ID,
        'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        'blackjack',
      )

      expect(result).toMatchObject({ id: TEST_INVITE_ID, status: 'pending', gameSlug: 'blackjack' })
    })

    it('throws duplicate error for already-pending invite', async () => {
      mockFrom.mockReturnValue(buildChain({ data: null, error: { code: '23505' } }))

      await expect(
        lobbyService.inviteFriend(TEST_ROOM_ID, 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'blackjack'),
      ).rejects.toThrow('already have a pending invite')
    })
  })

  // ── declineInvite / cancelInvite ──────────────────────────────────────────

  describe('declineInvite', () => {
    it('updates status to declined', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await lobbyService.declineInvite(TEST_INVITE_ID)

      expect(chain.update).toHaveBeenCalledWith({ status: 'declined' })
    })
  })

  describe('cancelInvite', () => {
    it('updates status to cancelled', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await lobbyService.cancelInvite(TEST_INVITE_ID)

      expect(chain.update).toHaveBeenCalledWith({ status: 'cancelled' })
    })
  })

  // ── launchGame ────────────────────────────────────────────────────────────

  describe('launchGame', () => {
    it('throws if caller is not the host', async () => {
      mockFrom.mockReturnValue(buildChain({
        data: { host_id: 'other-user-id', state: 'ready' },
        error: null,
      }))

      await expect(lobbyService.launchGame(TEST_ROOM_ID)).rejects.toThrow('Only the host')
    })

    it('throws if state is not ready', async () => {
      mockFrom.mockReturnValue(buildChain({
        data: { host_id: TEST_USER_ID, state: 'waiting' },
        error: null,
      }))

      await expect(lobbyService.launchGame(TEST_ROOM_ID)).rejects.toThrow('must be ready')
    })
  })
})
