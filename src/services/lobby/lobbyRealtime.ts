import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type {
  GameInvitation,
  GameRoom,
  InvitationCallback,
  RoomCallbacks,
  RoomPlayerChangeEvent,
  RoomState,
} from '@/types/lobby'

/**
 * Lobby Realtime.
 *
 * Manages resilient realtime subscriptions for:
 *  1. Room channel (per-room) — game_rooms updates, room_players INSERT/UPDATE/DELETE, game_events
 *  2. Public rooms channel — live list of open waiting/playing tables
 *  3. Invitation channel (singleton) — incoming game_invitations
 *
 * Automatically reconnects channels if a mobile tab wakes from sleep or regains connectivity.
 */

function isChannelHealthy(channel: RealtimeChannel | null): boolean {
  if (!channel) return false
  const state = (channel as unknown as { state?: string }).state
  return state === 'joined' || state === 'joining'
}

function mapRoomPayload(row: Record<string, unknown>): Partial<GameRoom> {
  const partial: Partial<GameRoom> = {}
  if (typeof row.state === 'string') partial.state = row.state as RoomState
  if (typeof row.max_players === 'number') partial.maxPlayers = row.max_players
  if (typeof row.is_public === 'boolean') partial.isPublic = row.is_public
  if (typeof row.host_id === 'string') partial.hostId = row.host_id
  if (typeof row.game_slug === 'string') partial.gameSlug = row.game_slug
  if ('started_at' in row) partial.startedAt = (row.started_at as string | null) ?? null
  if ('metadata' in row && row.metadata && typeof row.metadata === 'object') {
    partial.metadata = row.metadata as Record<string, unknown>
  }
  return partial
}

function extractPlayerChange(
  eventType: RoomPlayerChangeEvent['eventType'],
  payload: { new?: Record<string, unknown>; old?: Record<string, unknown> },
): RoomPlayerChangeEvent {
  const row = (eventType === 'DELETE' ? payload.old : payload.new) ?? {}
  return {
    eventType,
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    ready: typeof row.ready === 'boolean' ? row.ready : undefined,
  }
}

// ─────────────────────────────────────────────
// Room subscription (per-instance, auto-reconnecting)
// ─────────────────────────────────────────────

export function subscribeToRoom(roomId: string, callbacks: RoomCallbacks): () => void {
  let active = true
  let channel: RealtimeChannel | null = null
  let isSubscribed = false

  const buildAndSubscribe = () => {
    if (!active) return
    if (channel) {
      supabase.removeChannel(channel).catch(() => {})
      channel = null
    }
    isSubscribed = false

    channel = supabase
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
          if (mapped.state === 'playing') {
            callbacks.onGameStarted?.()
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callbacks.onPlayersChange(
            extractPlayerChange('INSERT', payload as { new?: Record<string, unknown> }),
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callbacks.onPlayersChange(
            extractPlayerChange('UPDATE', payload as { new?: Record<string, unknown> }),
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callbacks.onPlayersChange(
            extractPlayerChange('DELETE', payload as { old?: Record<string, unknown> }),
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = (payload.new ?? {}) as Record<string, unknown>
          if (row.type === 'game_started') {
            callbacks.onRoomChange({ state: 'playing' })
            callbacks.onGameStarted?.()
          }
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          callbacks.onChannelSubscribed?.()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSubscribed = false
        }
      })
  }

  buildAndSubscribe()

  const handleWake = () => {
    if (!active) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    if (!isSubscribed || !isChannelHealthy(channel)) {
      buildAndSubscribe()
    } else {
      callbacks.onChannelSubscribed?.()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleWake)
    window.addEventListener('focus', handleWake)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleWake)
  }

  return () => {
    active = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleWake)
      window.removeEventListener('focus', handleWake)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleWake)
    }
    if (channel) {
      supabase.removeChannel(channel).catch(() => {})
      channel = null
    }
  }
}

// ─────────────────────────────────────────────
// Public Rooms & Active Matches subscription
// ─────────────────────────────────────────────

export function subscribeToPublicRooms(onChange: () => void): () => void {
  let active = true
  let channel: RealtimeChannel | null = null
  let isSubscribed = false

  const buildAndSubscribe = () => {
    if (!active) return
    if (channel) {
      supabase.removeChannel(channel).catch(() => {})
      channel = null
    }
    isSubscribed = false

    channel = supabase
      .channel('public-rooms-lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => onChange(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        () => onChange(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          onChange()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSubscribed = false
        }
      })
  }

  buildAndSubscribe()

  const handleWake = () => {
    if (!active) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    if (!isSubscribed || !isChannelHealthy(channel)) {
      buildAndSubscribe()
    } else {
      onChange()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleWake)
    window.addEventListener('focus', handleWake)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleWake)
  }

  return () => {
    active = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleWake)
      window.removeEventListener('focus', handleWake)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleWake)
    }
    if (channel) {
      supabase.removeChannel(channel).catch(() => {})
      channel = null
    }
  }
}

// ─────────────────────────────────────────────
// Invitation subscription (singleton)
// ─────────────────────────────────────────────

const _inviteCallbacks = new Set<InvitationCallback>()
let _inviteChannel: RealtimeChannel | null = null
let _inviteSubscribed = false
let _wakeAttached = false

function handleInviteWake(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (_inviteCallbacks.size === 0) return
  if (!_inviteSubscribed || !isChannelHealthy(_inviteChannel)) {
    teardownInviteChannel()
    ensureInviteChannel()
  }
}

function attachInviteWakeListeners(): void {
  if (_wakeAttached || typeof window === 'undefined') return
  _wakeAttached = true
  window.addEventListener('online', handleInviteWake)
  window.addEventListener('focus', handleInviteWake)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleInviteWake)
  }
}

function detachInviteWakeListeners(): void {
  if (!_wakeAttached || typeof window === 'undefined') return
  _wakeAttached = false
  window.removeEventListener('online', handleInviteWake)
  window.removeEventListener('focus', handleInviteWake)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleInviteWake)
  }
}

function ensureInviteChannel(): void {
  if (_inviteChannel) return
  attachInviteWakeListeners()

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
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        _inviteSubscribed = true
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        _inviteSubscribed = false
      }
    })
}

function teardownInviteChannel(): void {
  if (_inviteChannel) {
    supabase.removeChannel(_inviteChannel).catch(() => {})
    _inviteChannel = null
  }
  _inviteSubscribed = false
}

export function subscribeToInvitations(callback: InvitationCallback): () => void {
  _inviteCallbacks.add(callback)
  ensureInviteChannel()

  return () => {
    _inviteCallbacks.delete(callback)
    if (_inviteCallbacks.size === 0) {
      teardownInviteChannel()
      detachInviteWakeListeners()
    }
  }
}

// ─────────────────────────────────────────────
// Testing utilities
// ─────────────────────────────────────────────

/** Reset invitation singleton. ONLY for unit tests. */
export function _resetInviteChannelForTesting(): void {
  teardownInviteChannel()
  detachInviteWakeListeners()
  _inviteCallbacks.clear()
}
