import type { Json } from '@/types/database'

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type CardRank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'

export interface Card {
  [key: string]: Json | undefined
  suit: CardSuit
  rank: CardRank
  value: number // Standard value (J/Q/K = 10, A = 11 initially)
  isHidden?: boolean // For dealer's hole card
}

export type BlackjackStatus =
  | 'waiting'
  | 'dealing'
  | 'player_turn'
  | 'dealer_turn'
  | 'settlement'
  | 'finished'

export type BlackjackPlayerState = 'waiting' | 'playing' | 'done'

export type BlackjackActionType = 'deal' | 'hit' | 'stand' | 'reset'

export interface BlackjackGame {
  id: string
  room_id: string
  status: BlackjackStatus
  deck: Card[]
  dealer_hand: Card[]
  dealer_score: number
  current_turn: string | null
  round: number
  created_at: string
  updated_at: string
}

export interface BlackjackPlayer {
  game_id: string
  user_id: string
  seat: number
  hand: Card[]
  score: number
  state: BlackjackPlayerState
  blackjack: boolean
  busted: boolean
  standing: boolean
  joined_at: string
}

export interface BlackjackAction {
  id: string
  game_id: string
  user_id: string
  type: BlackjackActionType
  payload: Record<string, unknown> | null
  created_at: string
}
