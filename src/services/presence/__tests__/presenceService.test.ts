import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as presenceService from '../presenceService'

/**
 * Presence service unit tests.
 * Supabase client is fully mocked via vi.hoisted.
 */

// ── Supabase mock ──────────────────────────────────────────────────────────

const { mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

/** Build a fluent chainable mock that resolves with { data, error } */
function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'upsert', 'in', 'eq']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  // Make the chain itself awaitable
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve)
  return chain
}

/** Build a mock Supabase Realtime channel */
function buildChannelMock() {
  const ch: Record<string, unknown> = {}
  ch.on = vi.fn(() => ch)
  ch.subscribe = vi.fn(() => ch)
  return ch
}

// ─────────────────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TEST_FRIEND_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'

describe('presenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    presenceService._resetForTesting()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    presenceService._resetForTesting()
  })

  // ── joinChannel ─────────────────────────────────────────────────────────────

  describe('joinChannel', () => {
    it('upserts is_online=true to DB', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await presenceService.joinChannel(TEST_USER_ID)

      expect(mockFrom).toHaveBeenCalledWith('presence')
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: TEST_USER_ID, is_online: true }),
        expect.objectContaining({ onConflict: 'user_id' }),
      )
    })

    it('starts the heartbeat timer', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await presenceService.joinChannel(TEST_USER_ID)
      const initialCallCount = (mockFrom as ReturnType<typeof vi.fn>).mock.calls.length

      // Advance time by one heartbeat interval
      await vi.advanceTimersByTimeAsync(30_000)

      // Heartbeat should have fired once more
      expect((mockFrom as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(initialCallCount)
    })

    it('is idempotent — calling twice does not crash', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await presenceService.joinChannel(TEST_USER_ID)
      await presenceService.joinChannel(TEST_USER_ID)

      expect(mockFrom).toHaveBeenCalledWith('presence')
    })
  })

  // ── leaveChannel ────────────────────────────────────────────────────────────

  describe('leaveChannel', () => {
    it('upserts is_online=false to DB', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await presenceService.joinChannel(TEST_USER_ID)
      vi.clearAllMocks()
      mockFrom.mockReturnValue(chain)

      await presenceService.leaveChannel()

      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ is_online: false }),
        expect.anything(),
      )
    })

    it('stops the heartbeat timer', async () => {
      const chain = buildChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await presenceService.joinChannel(TEST_USER_ID)
      await presenceService.leaveChannel()

      const callCountAfterLeave = (mockFrom as ReturnType<typeof vi.fn>).mock.calls.length

      // Advance time — heartbeat should NOT fire
      await vi.advanceTimersByTimeAsync(30_000)
      expect((mockFrom as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCountAfterLeave)
    })

    it('is safe to call when not joined', async () => {
      await expect(presenceService.leaveChannel()).resolves.not.toThrow()
    })
  })

  // ── getPresence ─────────────────────────────────────────────────────────────

  describe('getPresence', () => {
    it('returns mapped PresenceEntry array', async () => {
      const mockData = [
        { user_id: TEST_FRIEND_ID, is_online: true, last_seen: '2024-01-01T00:00:00Z' },
      ]
      const chain = buildChain({ data: mockData, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await presenceService.getPresence([TEST_FRIEND_ID])

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        userId: TEST_FRIEND_ID,
        isOnline: true,
        lastSeen: '2024-01-01T00:00:00Z',
      })
    })

    it('returns empty array for empty input', async () => {
      const result = await presenceService.getPresence([])
      expect(result).toEqual([])
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('throws on Supabase error', async () => {
      const chain = buildChain({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      await expect(presenceService.getPresence([TEST_FRIEND_ID])).rejects.toMatchObject({
        message: 'DB error',
      })
    })
  })

  // ── subscribeToPresenceUpdates ───────────────────────────────────────────────

  describe('subscribeToPresenceUpdates', () => {
    it('creates a Realtime channel on first subscription', () => {
      const channelMock = buildChannelMock()
      mockChannel.mockReturnValue(channelMock)

      presenceService.subscribeToPresenceUpdates(vi.fn())

      expect(mockChannel).toHaveBeenCalledWith('presence-db-changes')
      expect(channelMock.on).toHaveBeenCalled()
      expect(channelMock.subscribe).toHaveBeenCalled()
    })

    it('reuses the same channel for multiple subscribers', () => {
      const channelMock = buildChannelMock()
      mockChannel.mockReturnValue(channelMock)

      presenceService.subscribeToPresenceUpdates(vi.fn())
      presenceService.subscribeToPresenceUpdates(vi.fn())

      expect(mockChannel).toHaveBeenCalledTimes(1)
    })

    it('tears down the channel when last subscriber unsubscribes', () => {
      const channelMock = buildChannelMock()
      mockChannel.mockReturnValue(channelMock)

      const unsub = presenceService.subscribeToPresenceUpdates(vi.fn())
      unsub()

      expect(mockRemoveChannel).toHaveBeenCalled()
    })

    it('returns an unsubscribe function', () => {
      const channelMock = buildChannelMock()
      mockChannel.mockReturnValue(channelMock)

      const unsub = presenceService.subscribeToPresenceUpdates(vi.fn())
      expect(typeof unsub).toBe('function')
    })
  })
})
