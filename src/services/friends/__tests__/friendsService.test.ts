import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as friendsService from '../friendsService'

/**
 * Friends service tests.
 * Supabase client is fully mocked via vi.hoisted so the module is intercepted
 * before any import resolves.
 */

// ── Supabase mock ──────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

/** Build a fluent chainable mock that resolves with { data, error } */
function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'ilike', 'order', 'limit',
    'single', 'maybeSingle',
  ]
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  // Terminal methods resolve with result
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  // Make the chain itself thenable for awaiting
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve)
  return chain
}

const TEST_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TEST_FRIEND_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
const TEST_REQUEST_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'

// ─────────────────────────────────────────────────────────────────────────────

describe('friendsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getFriends ─────────────────────────────────────────────────────────────

  describe('getFriends', () => {
    it('returns mapped Friend objects on success', async () => {
      const mockData = [
        {
          id: TEST_REQUEST_ID,
          user_id: TEST_USER_ID,
          friend_id: TEST_FRIEND_ID,
          created_at: '2024-01-01T00:00:00Z',
          friend_profile: {
            id: TEST_FRIEND_ID,
            username: 'alice',
            display_name: 'Alice',
            avatar_url: null,
          },
        },
      ]
      const chain = buildChain({ data: mockData, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await friendsService.getFriends(TEST_USER_ID)

      expect(result).toHaveLength(1)
      expect(result[0].friendId).toBe(TEST_FRIEND_ID)
      expect(result[0].profile.username).toBe('alice')
    })

    it('throws on Supabase error', async () => {
      const chain = buildChain({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      await expect(friendsService.getFriends(TEST_USER_ID)).rejects.toMatchObject({
        message: 'DB error',
      })
    })

    it('rejects invalid userId', async () => {
      await expect(friendsService.getFriends('not-a-uuid')).rejects.toThrow()
    })
  })

  // ── sendRequest ────────────────────────────────────────────────────────────

  describe('sendRequest', () => {
    it('inserts a new request and returns it', async () => {
      const mockData = {
        id: TEST_REQUEST_ID,
        sender_id: TEST_USER_ID,
        receiver_id: TEST_FRIEND_ID,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const chain = buildChain({ data: mockData, error: null })
      mockFrom.mockReturnValue(chain)

      const req = await friendsService.sendRequest(TEST_USER_ID, TEST_FRIEND_ID)

      expect(req.senderId).toBe(TEST_USER_ID)
      expect(req.status).toBe('pending')
    })

    it('throws when trying to send to self', async () => {
      await expect(friendsService.sendRequest(TEST_USER_ID, TEST_USER_ID)).rejects.toThrow(
        'Cannot send a friend request to yourself',
      )
    })

    it('throws a user-friendly message on duplicate (23505)', async () => {
      const chain = buildChain({ data: null, error: { code: '23505', message: 'duplicate' } })
      mockFrom.mockReturnValue(chain)

      await expect(friendsService.sendRequest(TEST_USER_ID, TEST_FRIEND_ID)).rejects.toThrow(
        'A request already exists',
      )
    })
  })

  // ── acceptRequest ──────────────────────────────────────────────────────────

  describe('acceptRequest', () => {
    it('calls update with status accepted', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await friendsService.acceptRequest(TEST_REQUEST_ID)

      expect(mockFrom).toHaveBeenCalledWith('friend_requests')
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' }),
      )
    })

    it('throws on error', async () => {
      const chain = buildChain({ data: null, error: { message: 'forbidden' } })
      mockFrom.mockReturnValue(chain)

      await expect(friendsService.acceptRequest(TEST_REQUEST_ID)).rejects.toMatchObject({
        message: 'forbidden',
      })
    })
  })

  // ── rejectRequest ──────────────────────────────────────────────────────────

  describe('rejectRequest', () => {
    it('updates status to rejected', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await friendsService.rejectRequest(TEST_REQUEST_ID)

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rejected' }),
      )
    })
  })

  // ── cancelRequest ──────────────────────────────────────────────────────────

  describe('cancelRequest', () => {
    it('updates status to cancelled', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await friendsService.cancelRequest(TEST_REQUEST_ID)

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      )
    })
  })

  // ── removeFriend ───────────────────────────────────────────────────────────

  describe('removeFriend', () => {
    it('calls delete on friends table', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await friendsService.removeFriend(TEST_USER_ID, TEST_FRIEND_ID)

      expect(mockFrom).toHaveBeenCalledWith('friends')
      expect(chain.delete).toHaveBeenCalled()
    })
  })

  // ── searchUsers ────────────────────────────────────────────────────────────

  describe('searchUsers', () => {
    it('rejects query shorter than 2 characters', async () => {
      await expect(friendsService.searchUsers('a', TEST_USER_ID)).rejects.toThrow()
    })

    it('returns enriched results', async () => {
      // searchUsers calls supabase.from('profiles') then for each result calls
      // getRelationshipStatus which calls from('friends') and from('friend_requests').
      // We mock all from() calls to return safe empty data.
      const profileData = [
        { id: TEST_FRIEND_ID, username: 'alice', display_name: null, avatar_url: null },
      ]
      const emptyChain = buildChain({ data: [], error: null })
      const profileChain = buildChain({ data: profileData, error: null })
      const nullChain = buildChain({ data: null, error: null })

      // First call = profiles search, subsequent calls = relationship checks
      mockFrom
        .mockReturnValueOnce(profileChain)
        .mockReturnValue({ ...emptyChain, maybeSingle: vi.fn().mockResolvedValue(nullChain) })

      // Provide maybeSingle on nullChain too
      ;(nullChain as Record<string, unknown>).maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

      const results = await friendsService.searchUsers('ali', TEST_USER_ID)

      expect(results).toHaveLength(1)
      expect(results[0].username).toBe('alice')
    })
  })
})
