/**
 * Shared game interfaces — Phase 3 extended.
 *
 * Every game in the /games directory must conform to the IGamePlugin interface.
 * This ensures the lobby, routing, and room system can handle any game generically.
 */
import type { LucideIcon } from 'lucide-react'

/** Phases a game room passes through during its lifecycle */
export type GameStatus =
  | 'waiting'      // Room created, waiting for players
  | 'ready'        // Enough players ready, host can launch
  | 'dealing'      // Cards / initial state being distributed
  | 'player_turns' // Players making moves
  | 'dealer_turn'  // Automated/dealer phase
  | 'result'       // Round over, showing results
  | 'reset'        // Brief reset before next round

/** Minimal metadata every game must expose for the lobby/registry */
export interface IGamePlugin {
  /** Unique identifier, used in game_rooms.game_slug */
  id: string
  /** Display name shown in the lobby */
  name: string
  /** Short description shown in the game card */
  description: string
  /** Lucide icon to display in the game card */
  icon: LucideIcon
  /** Min/max players supported by this game */
  minPlayers: number
  maxPlayers: number
  /** Relative path to the game's cover image asset */
  coverImage: string
  /** Route path segment — e.g. "blackjack" → /room/:roomId */
  slug: string
  /** Whether the game is live and playable (false → "Coming Soon" badge) */
  isAvailable: boolean
  /**
   * Optional: called when a room is created for this game.
   * Returns any initial game-specific metadata to store.
   */
  createRoom?: (hostId: string, maxPlayers: number) => Record<string, unknown>
  /**
   * Optional: called when the host launches the game.
   * Returns initial game state.
   */
  launch?: (players: string[]) => Record<string, unknown>
}

/** A player seated in a game room */
export interface GamePlayer {
  userId: string
  username: string
  avatarUrl: string | null
  seatIndex: number
  isReady: boolean
}

/** Base shape for game state stored in game_rooms.metadata */
export interface BaseGameState {
  status: GameStatus
  players: GamePlayer[]
  currentTurnUserId: string | null
  roundNumber: number
}

/** Generic game event stored in game_events.payload */
export interface GameEvent<T = unknown> {
  type: string
  payload: T
  timestamp: string
}
