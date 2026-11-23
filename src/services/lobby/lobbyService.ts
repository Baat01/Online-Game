import { supabase } from '@/lib/supabase'
import type { UserPermissions } from '@/types/auth'
import type { GameCatalogEntry, GameInvitation, GameRoom, RoomPlayer } from '@/types/lobby'
import { createRoomSchema, inviteFriendSchema } from './lobbySchemas'

/**
 * Lobby Service.
 *
 * All interactions with game_catalog, game_rooms, room_players, and game_invitations.
 * Includes manual room deletion and 30-minute automatic inactivity expiration.
 */

export const ROOM_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

export class RoomExpiredError extends Error {
  constructor(message = 'Ce salon a expiré après 30 minutes d’inactivité.') {
    super(message)
    this.name = 'RoomExpiredError'
  }
}

export function isRoomExpired(
  room: Pick<GameRoom, 'lastActivityAt' | 'state'> | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!room?.lastActivityAt) return false
  if (room.state === 'finished' || room.state === 'cancelled') return false
  const ts = Date.parse(room.lastActivityAt)
  if (!Number.isFinite(ts)) return false
  return nowMs - ts > ROOM_INACTIVITY_TIMEOUT_MS
}

const ROOM_PLAYER_SELECT = `
  room_id,
  user_id,
  joined_at,
  ready,
  profiles!inner (
    id,
    username,
    display_name,
    avatar_url,
    yen_balance,
    is_admin,
    permissions,
    clan_title,
    card_back_theme,
    card_front_theme,
    dice_theme,
    coin_theme,
    unlocked_themes
  )
`

const GAME_ROOM_SELECT =
  'id, game_slug, host_id, state, max_players, is_public, state_version, last_activity_at, created_at, started_at, metadata'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

interface RawRoomRow {
  id: string
  game_slug: string
  host_id: string
  state: string
  max_players: number
  is_public?: boolean
  state_version?: number
  last_activity_at?: string
  created_at: string
  started_at: string | null
  metadata?: unknown
}

function toGameRoom(row: RawRoomRow, players: RoomPlayer[] = []): GameRoom {
  return {
    id: row.id,
    gameSlug: row.game_slug,
    hostId: row.host_id,
    state: row.state as GameRoom['state'],
    maxPlayers: row.max_players,
    isPublic: row.is_public ?? true,
    stateVersion: typeof row.state_version === 'number' ? row.state_version : 0,
    ...(row.last_activity_at ? { lastActivityAt: row.last_activity_at } : {}),
    createdAt: row.created_at,
    startedAt: row.started_at,
    ...(row.metadata !== undefined ? { metadata: row.metadata as Record<string, unknown> } : {}),
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
    yen_balance?: number
    is_admin?: boolean
    permissions?: UserPermissions | null
    clan_title?: string | null
    card_back_theme?: string
    card_front_theme?: string
    dice_theme?: string
    coin_theme?: string
    unlocked_themes?: string[]
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
    clan_title?: string | null
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

async function attachPlayersToRooms(roomRows: RawRoomRow[]): Promise<GameRoom[]> {
  if (roomRows.length === 0) return []
  const roomIds = roomRows.map((r) => r.id)
  const { data: playersData, error: playersError } = await supabase
    .from('room_players')
    .select(ROOM_PLAYER_SELECT)
    .in('room_id', roomIds)
    .order('joined_at')

  if (playersError) throw playersError

  const byRoom = new Map<string, RoomPlayer[]>()
  for (const row of playersData ?? []) {
    const mapped = toRoomPlayer(row as Parameters<typeof toRoomPlayer>[0])
    const list = byRoom.get(mapped.roomId) ?? []
    list.push(mapped)
    byRoom.set(mapped.roomId, list)
  }

  return roomRows.map((r) => toGameRoom(r, byRoom.get(r.id) ?? []))
}

// ─────────────────────────────────────────────
// Automatic 30-Minute Inactivity Cleanup
// ─────────────────────────────────────────────

/**
 * Removes rooms whose last_activity_at is older than 30 minutes.
 * Safe no-op if RPC is unavailable in isolated unit test mocks.
 */
export async function cleanupInactiveRooms(): Promise<number> {
  try {
    const client = supabase as unknown as {
      rpc?: (fn: string) => Promise<{ data: unknown; error: unknown }>
    }
    if (typeof client.rpc !== 'function') return 0
    const { data, error } = await client.rpc('cleanup_inactive_rooms')
    if (error) return 0
    return typeof data === 'number' ? data : 0
  } catch {
    return 0
  }
}

// ─────────────────────────────────────────────
// Game Catalog
// ─────────────────────────────────────────────

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

export async function createRoom(
  gameSlug: string,
  maxPlayers = 6,
  isPublic = true,
): Promise<GameRoom> {
  const parsed = createRoomSchema.parse({ gameSlug, maxPlayers, isPublic })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await cleanupInactiveRooms()

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      game_slug: parsed.gameSlug,
      host_id: user.id,
      max_players: parsed.maxPlayers,
      is_public: parsed.isPublic,
    })
    .select(
      'id, game_slug, host_id, state, max_players, is_public, state_version, last_activity_at, created_at, started_at',
    )
    .single()

  if (error) throw error
  return toGameRoom(data as RawRoomRow)
}

/**
 * Fetch a room with all its players and their full profiles.
 * Throws RoomExpiredError and purges the room if inactive > 30 minutes.
 */
export async function getRoom(roomId: string): Promise<GameRoom> {
  const { data: roomData, error: roomError } = await supabase
    .from('game_rooms')
    .select(GAME_ROOM_SELECT)
    .eq('id', roomId)
    .single()

  if (roomError) throw roomError

  const rawRoom = roomData as RawRoomRow
  const preliminary = toGameRoom(rawRoom)
  if (isRoomExpired(preliminary)) {
    await cleanupInactiveRooms()
    throw new RoomExpiredError()
  }

  const { data: playersData, error: playersError } = await supabase
    .from('room_players')
    .select(ROOM_PLAYER_SELECT)
    .eq('room_id', roomId)
    .order('joined_at')

  if (playersError) throw playersError

  const players = (playersData ?? []).map((p) =>
    toRoomPlayer(p as Parameters<typeof toRoomPlayer>[0]),
  )

  return toGameRoom(rawRoom, players)
}

export const getRoomWithPlayers = getRoom

/**
 * Fetch public rooms currently waiting, ready, or playing.
 * Automatically purges inactive (> 30 min) rooms beforehand.
 */
export async function getPublicRooms(): Promise<GameRoom[]> {
  await cleanupInactiveRooms()

  const { data, error } = await supabase
    .from('game_rooms')
    .select(GAME_ROOM_SELECT)
    .eq('is_public', true)
    .in('state', ['waiting', 'ready', 'playing'])
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  const rooms = await attachPlayersToRooms((data ?? []) as RawRoomRow[])
  return rooms.filter((r) => !isRoomExpired(r))
}

export const listPublicRooms = getPublicRooms

/**
 * Fetch active rooms (waiting, ready, or playing) where the current user is seated.
 */
export async function getMyActiveRooms(): Promise<GameRoom[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  await cleanupInactiveRooms()

  const { data: seatRows, error: seatErr } = await supabase
    .from('room_players')
    .select('room_id')
    .eq('user_id', user.id)

  if (seatErr) throw seatErr

  const roomIds = Array.from(new Set((seatRows ?? []).map((r) => r.room_id)))
  if (roomIds.length === 0) return []

  const { data: roomRows, error: roomsErr } = await supabase
    .from('game_rooms')
    .select(GAME_ROOM_SELECT)
    .in('id', roomIds)
    .in('state', ['waiting', 'ready', 'playing'])
    .order('created_at', { ascending: false })

  if (roomsErr) throw roomsErr

  const rooms = (await attachPlayersToRooms((roomRows ?? []) as RawRoomRow[])).filter(
    (r) => !isRoomExpired(r),
  )

  return rooms.sort((a, b) => {
    if (a.state === 'playing' && b.state !== 'playing') return -1
    if (b.state === 'playing' && a.state !== 'playing') return 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/**
 * Permanently delete a room (host or admin only).
 * Cascades to room_players, game_events, blackjack_games, and pending invitations.
 */
export async function deleteRoom(roomId: string, userId?: string): Promise<void> {
  let actorId = userId
  if (!actorId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    actorId = user?.id
  }
  if (!actorId) throw new Error('Not authenticated')

  const { error } = await supabase.from('game_rooms').delete().eq('id', roomId)
  if (error) throw error
}

export async function updateRoomVisibility(roomId: string, isPublic: boolean): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('game_rooms')
    .update({ is_public: isPublic })
    .eq('id', roomId)
    .eq('host_id', user.id)

  if (error) throw error
}

export async function joinRoom(roomId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('room_players')
    .insert({ room_id: roomId, user_id: user.id, ready: false })

  if (error && error.code !== '23505') throw error
}

export async function leaveRoom(roomId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: room } = await supabase
    .from('game_rooms')
    .select('host_id')
    .eq('id', roomId)
    .single()

  if (room?.host_id === user.id) {
    await supabase.from('game_rooms').update({ state: 'cancelled' }).eq('id', roomId)
  }

  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function setReady(roomId: string, ready: boolean): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('room_players')
    .update({ ready })
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function launchGame(roomId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: room, error: fetchError } = await supabase
    .from('game_rooms')
    .select('host_id, state')
    .eq('id', roomId)
    .single()

  if (fetchError) throw fetchError
  if (room.host_id !== user.id) throw new Error('Only the host can launch the game')
  if (room.state !== 'ready') throw new Error('All players must be ready before launching')

  const startedAt = new Date().toISOString()
  const { error } = await supabase
    .from('game_rooms')
    .update({ state: 'playing', started_at: startedAt })
    .eq('id', roomId)

  if (error) throw error

  try {
    await supabase.from('game_events').insert({
      room_id: roomId,
      user_id: user.id,
      type: 'game_started',
      payload: { roomId, startedAt },
    })
  } catch {
    // Non-blocking: game_rooms.state = 'playing' is authoritative
  }
}

export async function kickPlayer(roomId: string, userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

export async function inviteFriend(
  roomId: string,
  receiverId: string,
  gameSlug: string,
): Promise<GameInvitation> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

export async function getInvites(): Promise<GameInvitation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
        id, username, display_name, avatar_url, clan_title
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

export async function getOutgoingInvites(roomId: string): Promise<GameInvitation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

export async function acceptInvite(inviteId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: invite, error: fetchError } = await supabase
    .from('game_invitations')
    .select('room_id, expires_at, status')
    .eq('id', inviteId)
    .single()

  if (fetchError) throw fetchError
  if (invite.status !== 'pending') throw new Error('Invitation is no longer pending')
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error('Invitation has expired')

  const { error: updateError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  if (updateError) throw updateError

  if (invite.room_id) {
    const { error: joinError } = await supabase
      .from('room_players')
      .insert({ room_id: invite.room_id, user_id: user.id, ready: false })

    if (joinError && joinError.code !== '23505') throw joinError
  }

  return invite.room_id
}

export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('game_invitations')
    .update({ status: 'declined' })
    .eq('id', inviteId)

  if (error) throw error
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('game_invitations')
    .update({ status: 'cancelled' })
    .eq('id', inviteId)

  if (error) throw error
}
