import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PresenceEntry } from '@/types/presence'

/**
 * usePresence hook tests.
 * presenceService is mocked to avoid real Supabase calls.
 */

// ── Mock presenceService ────────────────────────────────────────────────────

const { mockGetPresence, mockSubscribeToPresenceUpdates } = vi.hoisted(() => ({
  mockGetPresence: vi.fn(),
  mockSubscribeToPresenceUpdates: vi.fn(),
}))

vi.mock('@/services/presence/presenceService', () => ({
  getPresence: mockGetPresence,
  subscribeToPresenceUpdates: mockSubscribeToPresenceUpdates,
}))

import { usePresence } from '@/hooks/usePresence'

// ─────────────────────────────────────────────────────────────────────────────

const FRIEND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeEntry(userId: string, isOnline: boolean, lastSeenMs = 0): PresenceEntry {
  return {
    userId,
    isOnline,
    lastSeen: new Date(Date.now() - lastSeenMs).toISOString(),
  }
}

function TestComponent({ userIds }: { userIds: string[] }) {
  const { isOnline, lastSeen, isLoading } = usePresence(userIds)

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <span data-testid="online">{isOnline(FRIEND_ID) ? 'online' : 'offline'}</span>
      <span data-testid="last-seen">{lastSeen(FRIEND_ID) ?? 'null'}</span>
    </div>
  )
}

function renderHook(userIds: string[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TestComponent userIds={userIds} />
    </QueryClientProvider>,
  )
}

// ─────────────────────────────────────────────────────────────────────────────

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: subscribe returns a noop unsubscribe
    mockSubscribeToPresenceUpdates.mockReturnValue(() => {})
  })

  it('shows loading initially', () => {
    mockGetPresence.mockImplementation(() => new Promise(() => {})) // never resolves

    renderHook([FRIEND_ID])
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows online when entry is online and fresh', async () => {
    mockGetPresence.mockResolvedValue([makeEntry(FRIEND_ID, true, 0)])

    renderHook([FRIEND_ID])

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('online')
    })
  })

  it('shows offline when entry is offline', async () => {
    mockGetPresence.mockResolvedValue([makeEntry(FRIEND_ID, false, 0)])

    renderHook([FRIEND_ID])

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('offline')
    })
  })

  it('shows offline when is_online=true but last_seen is >90s old (stale)', async () => {
    // Stale: 2 minutes ago
    mockGetPresence.mockResolvedValue([makeEntry(FRIEND_ID, true, 120_000)])

    renderHook([FRIEND_ID])

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('offline')
    })
  })

  it('shows offline for unknown user', async () => {
    mockGetPresence.mockResolvedValue([])

    renderHook([FRIEND_ID])

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('offline')
    })
  })

  it('updates when realtime event fires', async () => {
    // Start offline
    mockGetPresence.mockResolvedValue([makeEntry(FRIEND_ID, false, 0)])

    let capturedCallback: ((entry: PresenceEntry) => void) | null = null
    mockSubscribeToPresenceUpdates.mockImplementation((cb: (entry: PresenceEntry) => void) => {
      capturedCallback = cb
      return () => {}
    })

    renderHook([FRIEND_ID])

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('offline')
    })

    // Simulate realtime update — user comes online
    act(() => {
      capturedCallback?.(makeEntry(FRIEND_ID, true, 0))
    })

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('online')
    })
  })

  it('does not fetch when userIds is empty', () => {
    renderHook([])
    expect(mockGetPresence).not.toHaveBeenCalled()
  })

  it('calls subscribeToPresenceUpdates on mount', async () => {
    mockGetPresence.mockResolvedValue([])

    renderHook([FRIEND_ID])

    await waitFor(() => {
      expect(mockSubscribeToPresenceUpdates).toHaveBeenCalled()
    })
  })
})
