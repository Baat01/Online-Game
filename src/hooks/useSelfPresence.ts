import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { joinChannel, leaveChannel } from '@/services/presence/presenceService'

/**
 * useSelfPresence — Phase 2.4.
 *
 * Manages the CURRENT USER's presence lifecycle:
 *   - Joins (marks online) when user is authenticated
 *   - Leaves (marks offline) when user logs out or component unmounts
 *   - Refreshes presence on tab focus (handles sleep/wake and background tabs)
 *   - Calls leaveChannel on beforeunload (best-effort for tab close)
 *
 * Should be mounted ONCE at the root of the app (RootLayout).
 * Uses a singleton presenceService — safe to call joinChannel multiple times.
 */
export function useSelfPresence(): void {
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) return

    // Mark online immediately
    joinChannel(userId).catch(() => {})

    // Re-establish presence when tab becomes visible again
    // (mobile browsers may pause timers in background tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        joinChannel(userId).catch(() => {})
      }
    }

    // Best-effort offline signal on tab/window close
    // Note: beforeunload may not fire on mobile or when browser crashes.
    // The heartbeat timeout (90s client-side, 30s server-side) acts as fallback.
    const handleBeforeUnload = () => {
      void leaveChannel()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      leaveChannel().catch(() => {})
    }
  }, [userId])
}
