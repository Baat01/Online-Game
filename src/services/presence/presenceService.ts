import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { PresenceEntry, PresenceUpdateCallback } from '@/types/presence'

/**
 * Presence Service — Phase 2.4.
 *
 * Dual-layer strategy for reliability:
 *   1. DB writes (upsert to public.presence):  durable, survives reconnect
 *   2. Realtime postgres_changes listener:     fast push for friend list updates
 *
 * Self-presence (writing):
 *   joinChannel(userId)   — mark online, start heartbeat
 *   leaveChannel()        — mark offline, stop heartbeat
 *
 * Friend presence (reading):
 *   getPresence(userIds)              — one-shot DB fetch
 *   subscribeToPresenceUpdates(cb)    — realtime updates (singleton channel)
 *
 * Rules:
 *  - No React, no hooks, no UI
 *  - Singleton channels — never duplicated
 *  - Throws on unrecoverable errors; heartbeat errors are swallowed
 */

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000 // 30 seconds
const LISTENER_CHANNEL_NAME = 'presence-db-changes'

// ─────────────────────────────────────────────
// Singleton state — self presence
// ─────────────────────────────────────────────

let _selfUserId: string | null = null
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null

// ─────────────────────────────────────────────
// Singleton state — listener channel
// ─────────────────────────────────────────────

let _listenerChannel: RealtimeChannel | null = null
const _callbacks = new Set<PresenceUpdateCallback>()

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function upsertPresence(userId: string, isOnline: boolean): Promise<void> {
  const { error } = await supabase.from('presence').upsert(
    {
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

function stopHeartbeat(): void {
  if (_heartbeatTimer !== null) {
    clearInterval(_heartbeatTimer)
    _heartbeatTimer = null
  }
}

function startHeartbeat(userId: string): void {
  stopHeartbeat()
  _heartbeatTimer = setInterval(() => {
    upsertPresence(userId, true).catch(() => {
      // Network error during heartbeat — not fatal, will retry next interval
    })
  }, HEARTBEAT_INTERVAL_MS)
}

function ensureListenerChannel(): void {
  if (_listenerChannel) return

  _listenerChannel = supabase
    .channel(LISTENER_CHANNEL_NAME)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'presence' },
      (payload) => {
        const row = payload.new as Record<string, unknown>
        if (typeof row.user_id !== 'string' || typeof row.is_online !== 'boolean') return

        const entry: PresenceEntry = {
          userId: row.user_id,
          isOnline: row.is_online,
          lastSeen: typeof row.last_seen === 'string' ? row.last_seen : new Date().toISOString(),
        }
        _callbacks.forEach((cb) => cb(entry))
      },
    )
    .subscribe()
}

function teardownListenerChannel(): void {
  if (_listenerChannel) {
    supabase.removeChannel(_listenerChannel).catch(() => {})
    _listenerChannel = null
  }
}

// ─────────────────────────────────────────────
// Self-presence (write)
// ─────────────────────────────────────────────

/**
 * Mark the current user as online and start the heartbeat.
 * Idempotent — safe to call multiple times (e.g. on tab focus).
 */
export async function joinChannel(userId: string): Promise<void> {
  _selfUserId = userId
  await upsertPresence(userId, true)
  startHeartbeat(userId)
}

/**
 * Mark the current user as offline and stop the heartbeat.
 * Safe to call even if not currently joined.
 */
export async function leaveChannel(): Promise<void> {
  const uid = _selfUserId
  _selfUserId = null
  stopHeartbeat()
  if (uid) {
    // Best-effort — may fail on beforeunload
    await upsertPresence(uid, false).catch(() => {})
  }
}

// ─────────────────────────────────────────────
// Friend presence (read)
// ─────────────────────────────────────────────

/**
 * Fetch current presence rows for the given user IDs from the DB.
 * Returns only rows that exist (absent userId → assume offline).
 */
export async function getPresence(userIds: string[]): Promise<PresenceEntry[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('presence')
    .select('user_id, is_online, last_seen')
    .in('user_id', userIds)

  if (error) throw error

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    isOnline: row.is_online,
    lastSeen: row.last_seen,
  }))
}

/**
 * Subscribe to ALL realtime presence updates.
 * The callback is called for every user whose presence changes.
 * Callers should filter by their relevant userIds.
 *
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Uses a singleton Realtime channel shared across all subscribers
 * to avoid opening multiple sockets.
 */
export function subscribeToPresenceUpdates(callback: PresenceUpdateCallback): () => void {
  _callbacks.add(callback)
  ensureListenerChannel()

  return () => {
    _callbacks.delete(callback)
    if (_callbacks.size === 0) {
      teardownListenerChannel()
    }
  }
}

// ─────────────────────────────────────────────
// Testing utilities
// ─────────────────────────────────────────────

/**
 * Reset all singleton state.
 * ONLY for use in unit tests — never call in production code.
 */
export function _resetForTesting(): void {
  stopHeartbeat()
  teardownListenerChannel()
  _selfUserId = null
  _callbacks.clear()
}
