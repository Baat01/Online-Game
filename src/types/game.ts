/**
 * Shared game interfaces.
 *
 * Every game in the /games directory must conform to the IGamePlugin interface.
 * This ensures the lobby, routing, and room system can handle any game generically.
 */

/** Phases a game room passes through during its lifecycle */
export type GameStatus =
  | 'waiting'     // Room created, waiting for players
  | 'ready'       // Enough players, game can start
  | 'dealing'     // Cards / initial state being distributed
  | 'player_turns'// Players making moves
  | 'dealer_turn' // Automated/dealer phase
  | 'result'      // Round over, showing results
  | 'reset'       // Brief reset before next round

/** Minimal metadata every game must expose for the lobby/registry */
export interface IGamePlugin {
  /** Unique identifier, used in game_rooms.game_type */
  id: string
  /** Display name shown in the lobby */
  name: string
  /** Short description */
  description: string
  /** Min/max players supported */
  minPlayers: number
  maxPlayers: number
  /** Relative path to the game's cover image asset */
  coverImage: string
  /** Route path segment — e.g. "blackjack" → /game/:roomId */
  slug: string
  /** Whether the game is available to play (vs. coming soon) */
  isAvailable: boolean
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
