import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { GameInvitation, RoomCallbacks, InvitationCallback } from '@/types/lobby'

/**
 * Lobby Realtime — Phase 3.
 *
 * Two channel types:
 *  1. Room channel (per-room) — tracks game_rooms + room_players changes
 *  2. Invitation channel (singleton) — tracks new incoming game_invitations
 *
 * Design:
 *  - Room channels are NOT singleton: one per active GameRoomPage (only one at a time)
 *  - Invitation channel IS singleton: multiple consumers share one socket
 */

// ─────────────────────────────────────────────
// Room subscription (per-instance, not singleton)
// ─────────────────────────────────────────────

/**
 * Subscribe to realtime changes for a specific room.
 * Listens to both game_rooms row updates and room_players INSERT/UPDATE/DELETE.
 *
 * Returns an unsubscribe function — call it on component unmount.
 */
function mapRoomPayload(row: Record<string, unknown>): Partial<import('@/types/lobby').GameRoom> {
  const partial: Partial<import('@/types/lobby').GameRoom> = {}
  if (typeof row.state === 'string') partial.state = row.state as import('@/types/lobby').RoomState
  if (typeof row.max_players === 'number') partial.maxPlayers = row.max_players
  if (typeof row.host_id === 'string') partial.hostId = row.host_id
  if (typeof row.game_slug === 'string') partial.gameSlug = row.game_slug
  if ('started_at' in row) partial.startedAt = (row.started_at as string | null) ?? null
  if ('metadata' in row && row.metadata && typeof row.metadata === 'object') {
    partial.metadata = row.metadata as Record<string, unknown>
  }
  return partial
}

export function subscribeToRoom(roomId: string, callbacks: RoomCallbacks): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        const mapped = mapRoomPayload((payload.new ?? {}) as Record<string, unknown>)
        callbacks.onRoomChange(mapped)
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        // Trigger a full players refresh — simpler than partial updates
        callbacks.onPlayersChange()
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      () => {
        callbacks.onPlayersChange()
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel).catch(() => {})
  }
}

// ─────────────────────────────────────────────
// Invitation subscription (singleton)
// ─────────────────────────────────────────────

const _inviteCallbacks = new Set<InvitationCallback>()
let _inviteChannel: RealtimeChannel | null = null

function ensureInviteChannel(): void {
  if (_inviteChannel) return

  _inviteChannel = supabase
    .channel('invite-listener')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_invitations',
      },
      (payload) => {
        // RLS filters to the current user automatically
        const row = payload.new as Record<string, unknown>
        const invite: GameInvitation = {
          id: row.id as string,
          senderId: row.sender_id as string,
          receiverId: row.receiver_id as string,
          gameSlug: row.game_slug as string,
          roomId: (row.room_id as string | null) ?? null,
          status: 'pending',
          createdAt: row.created_at as string,
          expiresAt: row.expires_at as string,
        }
        _inviteCallbacks.forEach((cb) => cb(invite))
      },
    )
    .subscribe()
}

function teardownInviteChannel(): void {
  if (_inviteChannel) {
    supabase.removeChannel(_inviteChannel).catch(() => {})
    _inviteChannel = null
  }
}

/**
 * Subscribe to new incoming game invitations for the current session.
 * Uses a singleton channel shared across all subscribers.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToInvitations(callback: InvitationCallback): () => void {
  _inviteCallbacks.add(callback)
  ensureInviteChannel()

  return () => {
    _inviteCallbacks.delete(callback)
    if (_inviteCallbacks.size === 0) {
      teardownInviteChannel()
    }
  }
}

// ─────────────────────────────────────────────
// Testing utilities
// ─────────────────────────────────────────────

/** Reset invitation singleton. ONLY for unit tests. */
export function _resetInviteChannelForTesting(): void {
  teardownInviteChannel()
  _inviteCallbacks.clear()
}
