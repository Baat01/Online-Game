/**
 * Presence domain types — Phase 2.4.
 * Decoupled from auth.ts / database.ts to keep modules focused.
 */

/** A single user's presence state, mapped from public.presence rows */
export interface PresenceEntry {
  userId: string
  isOnline: boolean
  /** ISO 8601 timestamp — when the user last sent a heartbeat */
  lastSeen: string
}

/**
 * A Map of userId → PresenceEntry.
 * Used as the primary data structure in usePresence.
 */
export type PresenceMap = Map<string, PresenceEntry>

/**
 * Callback type used by presenceService.subscribeToPresenceUpdates().
 * Fired on every realtime UPDATE to public.presence for tracked users.
 */
export type PresenceUpdateCallback = (entry: PresenceEntry) => void
