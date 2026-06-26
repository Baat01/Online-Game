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

export type RoomState = 'waiting' | 'ready' | 'playing' | 'finished' | 'cancelled'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

export type FriendStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          is_online: boolean
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          display_name?: string | null
          bio?: string | null
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
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      friend_requests: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          status: FriendStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          status?: FriendStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: FriendStatus
          updated_at?: string
        }
      }
      game_catalog: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          min_players: number
          max_players: number
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string
          min_players?: number
          max_players?: number
          enabled?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          enabled?: boolean
        }
      }
      game_rooms: {
        Row: {
          id: string
          game_slug: string
          host_id: string
          state: RoomState
          max_players: number
          created_at: string
          started_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          game_slug: string
          host_id: string
          state?: RoomState
          max_players?: number
          created_at?: string
          started_at?: string | null
          metadata?: Json
        }
        Update: {
          state?: RoomState
          max_players?: number
          started_at?: string | null
          metadata?: Json
        }
      }
      game_events: {
        Row: {
          id: string
          room_id: string
          user_id: string | null
          type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id?: string | null
          type: string
          payload?: Json
          created_at?: string
        }
        Update: {
          type?: string
          payload?: Json
        }
      }
      game_history: {
        Row: {
          id: string
          room_id: string
          game_slug: string
          players: Json
          winner_id: string | null
          duration: number | null
          started_at: string | null
          ended_at: string
        }
        Insert: {
          id?: string
          room_id: string
          game_slug: string
          players: Json
          winner_id?: string | null
          duration?: number | null
          started_at?: string | null
          ended_at?: string
        }
        Update: {
          winner_id?: string | null
        }
      }
      rankings: {
        Row: {
          id: string
          user_id: string
          game_slug: string
          rating: number
          wins: number
          losses: number
          draws: number
        }
        Insert: {
          id?: string
          user_id: string
          game_slug: string
          rating?: number
          wins?: number
          losses?: number
          draws?: number
        }
        Update: {
          rating?: number
          wins?: number
          losses?: number
          draws?: number
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      room_players: {
        Row: {
          room_id: string
          user_id: string
          joined_at: string
          ready: boolean
        }
        Insert: {
          room_id: string
          user_id: string
          joined_at?: string
          ready?: boolean
        }
        Update: {
          ready?: boolean
        }
      }
      game_invitations: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          game_slug: string
          room_id: string | null
          status: InvitationStatus
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          game_slug: string
          room_id?: string | null
          status?: InvitationStatus
          created_at?: string
          expires_at?: string
        }
        Update: {
          status?: InvitationStatus
        }
      }
      presence: {
        Row: {
          user_id: string
          is_online: boolean
          last_seen: string
        }
        Insert: {
          user_id: string
          is_online?: boolean
          last_seen?: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
        }
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
