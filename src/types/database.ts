/**
 * Database types — generated stub.
 *
 * In production, generate this file with the Supabase CLI:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 *
 * This stub is hand-crafted to match the schema in supabase/migrations/0001_initial_schema.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type GameStatus =
  | 'waiting'
  | 'ready'
  | 'dealing'
  | 'player_turns'
  | 'dealer_turn'
  | 'result'
  | 'reset'

export type FriendStatus = 'pending' | 'accepted' | 'blocked'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          is_online: boolean
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          is_online?: boolean
          last_seen?: string
          updated_at?: string
        }
      }
      friends: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: FriendStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: FriendStatus
          created_at?: string
        }
        Update: {
          status?: FriendStatus
        }
      }
      friend_requests: {
        Row: {
          id: string
          from_id: string
          to_id: string
          status: FriendStatus
          created_at: string
        }
        Insert: {
          id?: string
          from_id: string
          to_id: string
          status?: FriendStatus
          created_at?: string
        }
        Update: {
          status?: FriendStatus
        }
      }
      game_rooms: {
        Row: {
          id: string
          game_type: string
          status: GameStatus
          host_id: string
          max_players: number
          current_players: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_type: string
          status?: GameStatus
          host_id: string
          max_players?: number
          current_players?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: GameStatus
          current_players?: number
          metadata?: Json
          updated_at?: string
        }
      }
      game_events: {
        Row: {
          id: string
          room_id: string
          type: string
          payload: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          type: string
          payload: Json
          created_by?: string | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      game_status: GameStatus
      friend_status: FriendStatus
    }
  }
}
