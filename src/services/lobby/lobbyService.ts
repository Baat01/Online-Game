import { supabase } from '@/lib/supabase'
import type { GameCatalogEntry, GameInvitation, GameRoom, RoomPlayer } from '@/types/lobby'
import { createRoomSchema, inviteFriendSchema } from './lobbySchemas'

/**
 * Lobby Service — Phase 3.
 *
 * All interactions with game_catalog, game_rooms, room_players, and game_invitations.
 * No React, no hooks, no UI logic.
 *
 * Architecture:
 *  - Every function returns typed domain objects (not raw Supabase rows)
 *  - Throws on error — callers (hooks) handle error state
 *  - Zod validation on all inputs before hitting the DB
 */

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toGameRoom(
  row: {
    id: string
    game_slug: string
    host_id: string
    state: string
    max_players: number
    created_at: string
    started_at: string | null
  },
  players: RoomPlayer[] = [],
): GameRoom {
  return {
    id: row.id,
    gameSlug: row.game_slug,
    hostId: row.host_id,
    state: row.state as GameRoom['state'],
    maxPlayers: row.max_players,
    createdAt: row.created_at,
    startedAt: row.started_at,
    players,
  }
}

function toRoomPlayer(row: {
  room_id: string
  user_id: string
  joined_at: string
  ready: boolean
  profiles: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}): RoomPlayer {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
    ready: row.ready,
    profile: row.profiles ?? {
      id: row.user_id,
      username: 'Unknown',
      display_name: null,
      avatar_url: null,
    },
  }
}

function toInvitation(row: {
  id: string
  sender_id: string
  receiver_id: string
  game_slug: string
  room_id: string | null
  status: string
  created_at: string
  expires_at: string
  sender_profile?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
  receiver_profile?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}): GameInvitation {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    gameSlug: row.game_slug,
    roomId: row.room_id,
    status: row.status as GameInvitation['status'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    ...(row.sender_profile ? { sender: row.sender_profile } : {}),
    ...(row.receiver_profile ? { receiver: row.receiver_profile } : {}),
  }
}

// ─────────────────────────────────────────────
// Game Catalog
// ─────────────────────────────────────────────

/**
 * Fetch all enabled games from the catalog.
 */
export async function getGames(): Promise<GameCatalogEntry[]> {
  const { data, error } = await supabase
    .from('game_catalog')
    .select('id, slug, name, description, min_players, max_players, enabled')
    .eq('enabled', true)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    enabled: row.enabled,
  }))
}

// ─────────────────────────────────────────────
// Rooms
// ─────────────────────────────────────────────

/**
 * Create a new game room. The DB trigger auto-seats the host.
 */
export async function createRoom(gameSlug: string, maxPlayers = 6): Promise<GameRoom> {
  const parsed = createRoomSchema.parse({ gameSlug, maxPlayers })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({ game_slug: parsed.gameSlug, host_id: user.id, max_players: parsed.maxPlayers })
    .select('id, game_slug, host_id, state, max_players, created_at, started_at')
    .single()

  if (error) throw error
  return toGameRoom(data)
}

/**
 * Fetch a room with all its players and their profiles.
 */
export async function getRoom(roomId: string): Promise<GameRoom> {
  const { data: roomData, error: roomError } = await supabase
    .from('game_rooms')
    .select('id, game_slug, host_id, state, max_players, created_at, started_at')
    .eq('id', roomId)
    .single()

  if (roomError) throw roomError

  const { data: playersData, error: playersError } = await supabase
    .from('room_players')
    .select(`
      room_id,
      user_id,
      joined_at,
      ready,
      profiles!inner (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('room_id', roomId)
    .order('joined_at')

  if (playersError) throw playersError

  const players = (playersData ?? []).map((p) =>
    toRoomPlayer(p as Parameters<typeof toRoomPlayer>[0]),
  )

  return toGameRoom(roomData, players)
}

/**
 * Join an existing room (insert the current user into room_players).
 */
export async function joinRoom(roomId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('room_players')
    .insert({ room_id: roomId, user_id: user.id, ready: false })

  if (error) throw error
}

/**
 * Leave a room (remove self from room_players).
 * If the current user is the host and other players remain, the room is cancelled.
 */
export async function leaveRoom(roomId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if user is host
  const { data: room } = await supabase
    .from('game_rooms')
    .select('host_id')
    .eq('id', roomId)
    .single()

  if (room?.host_id === user.id) {
    // Host is leaving — cancel the room
    await supabase.from('game_rooms').update({ state: 'cancelled' }).eq('id', roomId)
  }

  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Toggle the current user's ready state in a room.
 */
export async function setReady(roomId: string, ready: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('room_players')
    .update({ ready })
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Launch the game. Host-only. Requires room state to be 'ready'.
 * Sets state to 'playing'.
 */
export async function launchGame(roomId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: room, error: fetchError } = await supabase
    .from('game_rooms')
    .select('host_id, state')
    .eq('id', roomId)
    .single()

  if (fetchError) throw fetchError
  if (room.host_id !== user.id) throw new Error('Only the host can launch the game')
  if (room.state !== 'ready') throw new Error('All players must be ready before launching')

  const { error } = await supabase
    .from('game_rooms')
    .update({ state: 'playing' })
    .eq('id', roomId)

  if (error) throw error
}

/**
 * Kick a player from the room. Host-only.
 */
export async function kickPlayer(roomId: string, userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: room } = await supabase
    .from('game_rooms')
    .select('host_id')
    .eq('id', roomId)
    .single()

  if (room?.host_id !== user.id) throw new Error('Only the host can kick players')

  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)

  if (error) throw error
}

// ─────────────────────────────────────────────
// Invitations
// ─────────────────────────────────────────────

/**
 * Invite a friend to join a specific room.
 */
export async function inviteFriend(
  roomId: string,
  receiverId: string,
  gameSlug: string,
): Promise<GameInvitation> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const parsed = inviteFriendSchema.parse({ roomId, receiverId, gameSlug })

  const { data, error } = await supabase
    .from('game_invitations')
    .insert({
      sender_id: user.id,
      receiver_id: parsed.receiverId,
      game_slug: parsed.gameSlug,
      room_id: parsed.roomId,
    })
    .select('id, sender_id, receiver_id, game_slug, room_id, status, created_at, expires_at')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('You already have a pending invite for this user.')
    throw error
  }

  return toInvitation(data)
}

/**
 * Fetch pending incoming invitations for the current user.
 * Filters out expired invitations client-side.
 */
export async function getInvites(): Promise<GameInvitation[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('game_invitations')
    .select(`
      id,
      sender_id,
      receiver_id,
      game_slug,
      room_id,
      status,
      created_at,
      expires_at,
      sender_profile:profiles!game_invitations_sender_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  const now = Date.now()
  return (data ?? [])
    .filter((row) => new Date(row.expires_at).getTime() > now)
    .map((row) =>
      toInvitation({
        ...row,
        sender_profile: Array.isArray(row.sender_profile)
          ? row.sender_profile[0]
          : row.sender_profile,
      }),
    )
}

/**
 * Fetch outgoing invitations for a specific room.
 */
export async function getOutgoingInvites(roomId: string): Promise<GameInvitation[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('game_invitations')
    .select(`
      id,
      sender_id,
      receiver_id,
      game_slug,
      room_id,
      status,
      created_at,
      expires_at,
      receiver_profile:profiles!game_invitations_receiver_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .eq('sender_id', user.id)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) =>
    toInvitation({
      ...row,
      receiver_profile: Array.isArray(row.receiver_profile)
        ? row.receiver_profile[0]
        : row.receiver_profile,
    }),
  )
}

/**
 * Accept an invitation and auto-join the associated room.
 */
export async function acceptInvite(inviteId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch invite to get room_id
  const { data: invite, error: fetchError } = await supabase
    .from('game_invitations')
    .select('room_id, expires_at, status')
    .eq('id', inviteId)
    .single()

  if (fetchError) throw fetchError
  if (invite.status !== 'pending') throw new Error('Invitation is no longer pending')
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error('Invitation has expired')

  // Mark as accepted
  const { error: updateError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  if (updateError) throw updateError

  // Join the room if one is attached
  if (invite.room_id) {
    const { error: joinError } = await supabase
      .from('room_players')
      .insert({ room_id: invite.room_id, user_id: user.id, ready: false })

    // Ignore "already in room" conflicts
    if (joinError && joinError.code !== '23505') throw joinError
  }

  return invite.room_id
}

/**
 * Decline an incoming invitation.
 */
export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('game_invitations')
    .update({ status: 'declined' })
    .eq('id', inviteId)

  if (error) throw error
}

/**
 * Cancel an outgoing invitation (sender only).
 */
export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('game_invitations')
    .update({ status: 'cancelled' })
    .eq('id', inviteId)

  if (error) throw error
}
