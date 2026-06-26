import { useCallback, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPresence,
  subscribeToPresenceUpdates,
} from '@/services/presence/presenceService'
import type { PresenceEntry, PresenceMap } from '@/types/presence'

// ─────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────

export const presenceKeys = {
  all: ['presence'] as const,
  list: (sortedIds: string) => ['presence', 'list', sortedIds] as const,
}

/**
 * Maximum age (ms) before an is_online=true row is treated as offline.
 * 3× the heartbeat interval (30s) = 90s.
 */
const STALE_THRESHOLD_MS = 90_000

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * usePresence — Phase 2.4.
 *
 * Reads and subscribes to the presence of a list of user IDs.
 *
 * Features:
 *  - One-shot DB fetch on mount / userIds change
 *  - Realtime subscription (shared singleton channel) for live updates
 *  - Stale-online check: is_online=true but last_seen >90s ago → treated offline
 *  - Memoized presenceMap and selector callbacks for low re-render count
 *
 * Usage:
 *   const { isOnline, lastSeen } = usePresence(friends.map(f => f.friendId))
 */
export function usePresence(userIds: string[]) {
  const queryClient = useQueryClient()

  // Stable string key — only changes if the actual set of IDs changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedIds = useMemo(() => [...userIds].sort().join(','), [userIds.join(',')])
  const queryKey = presenceKeys.list(sortedIds)

  // ── Initial DB fetch ───────────────────────────────────────────────────────

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getPresence(userIds),
    enabled: userIds.length > 0,
    staleTime: 1000 * 60, // 1 minute — realtime updates handle freshness
  })

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (userIds.length === 0) return

    // Capture the query key for this effect's lifetime
    const key = presenceKeys.list(sortedIds)

    const unsubscribe = subscribeToPresenceUpdates((entry) => {
      // Update only if this userId is in our current dataset
      queryClient.setQueryData<PresenceEntry[]>(key, (old) => {
        if (!old) return old
        const idx = old.findIndex((e) => e.userId === entry.userId)
        if (idx === -1) return old // not in our tracked list
        const next = [...old]
        next[idx] = entry
        return next
      })
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedIds, queryClient])

  // ── Derived state ──────────────────────────────────────────────────────────

  const presenceMap: PresenceMap = useMemo(() => {
    const map = new Map<string, PresenceEntry>()
    entries.forEach((e) => map.set(e.userId, e))
    return map
  }, [entries])

  /**
   * Returns true if the user is considered online.
   * Applies a staleness guard: is_online=true but last_seen >90s ago → offline.
   */
  const isOnline = useCallback(
    (userId: string): boolean => {
      const entry = presenceMap.get(userId)
      if (!entry?.isOnline) return false
      // Guard against stale heartbeat (e.g. user closed tab without cleanup)
      return Date.now() - new Date(entry.lastSeen).getTime() < STALE_THRESHOLD_MS
    },
    [presenceMap],
  )

  /**
   * Returns the ISO last_seen timestamp for the user, or null if unknown.
   */
  const lastSeen = useCallback(
    (userId: string): string | null => presenceMap.get(userId)?.lastSeen ?? null,
    [presenceMap],
  )

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: presenceKeys.all }),
    [queryClient],
  )

  return {
    presenceMap,
    isOnline,
    lastSeen,
    isLoading,
    refresh,
  }
}
