/**
 * Lobby domain types — Phase 3.
 * All domain objects for game catalog, rooms, players, and invitations.
 */

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type RoomState = 'waiting' | 'ready' | 'playing' | 'finished' | 'cancelled'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

// ─────────────────────────────────────────────
// Game catalog
// ─────────────────────────────────────────────

/** A row from the game_catalog table, enriched with client-side registry data */
export interface GameCatalogEntry {
  id: string
  slug: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  enabled: boolean
}

// ─────────────────────────────────────────────
// Rooms
// ─────────────────────────────────────────────

/** A slim profile reference used inside RoomPlayer */
export interface PlayerProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

/** A player seated in a game room */
export interface RoomPlayer {
  roomId: string
  userId: string
  joinedAt: string
  ready: boolean
  profile: PlayerProfile
}

/** Full game room with its players */
export interface GameRoom {
  id: string
  gameSlug: string
  hostId: string
  state: RoomState
  maxPlayers: number
  createdAt: string
  startedAt: string | null
  players: RoomPlayer[]
}

// ─────────────────────────────────────────────
// Invitations
// ─────────────────────────────────────────────

/** A game invitation from one user to another */
export interface GameInvitation {
  id: string
  senderId: string
  receiverId: string
  gameSlug: string
  roomId: string | null
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  /** Populated when loading received invitations */
  sender?: PlayerProfile
  /** Populated when loading sent invitations */
  receiver?: PlayerProfile
}

// ─────────────────────────────────────────────
// Realtime callback shapes
// ─────────────────────────────────────────────

export interface RoomCallbacks {
  onRoomChange: (partial: Partial<GameRoom>) => void
  onPlayersChange: () => void
}

export type InvitationCallback = (invite: GameInvitation) => void
