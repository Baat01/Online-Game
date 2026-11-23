export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface DbUserPermissions {
  can_create_accounts: boolean
  can_grant_themes: boolean
  can_set_custom_stakes: boolean
  unlimited_yen: boolean
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blackjack_actions: {
        Row: {
          created_at: string
          game_id: string
          id: string
          payload: Json | null
          type: Database["public"]["Enums"]["blackjack_action_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          payload?: Json | null
          type: Database["public"]["Enums"]["blackjack_action_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          payload?: Json | null
          type?: Database["public"]["Enums"]["blackjack_action_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blackjack_actions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "blackjack_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blackjack_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blackjack_games: {
        Row: {
          created_at: string
          current_turn: string | null
          dealer_hand: Json
          dealer_score: number
          deck: Json
          id: string
          room_id: string
          round: number
          status: Database["public"]["Enums"]["blackjack_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_turn?: string | null
          dealer_hand?: Json
          dealer_score?: number
          deck?: Json
          id?: string
          room_id: string
          round?: number
          status?: Database["public"]["Enums"]["blackjack_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_turn?: string | null
          dealer_hand?: Json
          dealer_score?: number
          deck?: Json
          id?: string
          room_id?: string
          round?: number
          status?: Database["public"]["Enums"]["blackjack_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blackjack_games_current_turn_fkey"
            columns: ["current_turn"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blackjack_games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      blackjack_players: {
        Row: {
          blackjack: boolean
          busted: boolean
          game_id: string
          hand: Json
          joined_at: string
          score: number
          seat: number
          standing: boolean
          state: Database["public"]["Enums"]["blackjack_player_state"]
          user_id: string
        }
        Insert: {
          blackjack?: boolean
          busted?: boolean
          game_id: string
          hand?: Json
          joined_at?: string
          score?: number
          seat: number
          standing?: boolean
          state?: Database["public"]["Enums"]["blackjack_player_state"]
          user_id: string
        }
        Update: {
          blackjack?: boolean
          busted?: boolean
          game_id?: string
          hand?: Json
          joined_at?: string
          score?: number
          seat?: number
          standing?: boolean
          state?: Database["public"]["Enums"]["blackjack_player_state"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blackjack_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "blackjack_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blackjack_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["friend_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_catalog: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          max_players: number
          min_players: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          max_players?: number
          min_players?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          max_players?: number
          min_players?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      game_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          room_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          room_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          room_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_history: {
        Row: {
          duration: number | null
          ended_at: string
          game_slug: string
          id: string
          players: Json
          room_id: string
          started_at: string | null
          winner_id: string | null
        }
        Insert: {
          duration?: number | null
          ended_at?: string
          game_slug: string
          id?: string
          players: Json
          room_id: string
          started_at?: string | null
          winner_id?: string | null
        }
        Update: {
          duration?: number | null
          ended_at?: string
          game_slug?: string
          id?: string
          players?: Json
          room_id?: string
          started_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_history_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_invitations: {
        Row: {
          created_at: string
          expires_at: string
          game_slug: string
          id: string
          receiver_id: string
          room_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          created_at?: string
          expires_at?: string
          game_slug: string
          id?: string
          receiver_id: string
          room_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          created_at?: string
          expires_at?: string
          game_slug?: string
          id?: string
          receiver_id?: string
          room_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "game_invitations_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "game_catalog"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "game_invitations_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          game_slug: string
          host_id: string
          id: string
          max_players: number
          metadata: Json
          started_at: string | null
          state: Database["public"]["Enums"]["room_state"]
        }
        Insert: {
          created_at?: string
          game_slug: string
          host_id: string
          id?: string
          max_players?: number
          metadata?: Json
          started_at?: string | null
          state?: Database["public"]["Enums"]["room_state"]
        }
        Update: {
          created_at?: string
          game_slug?: string
          host_id?: string
          id?: string
          max_players?: number
          metadata?: Json
          started_at?: string | null
          state?: Database["public"]["Enums"]["room_state"]
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "game_catalog"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "game_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          card_back_theme: string
          card_front_theme: string
          clan_title: string | null
          coin_theme: string
          created_at: string
          dice_theme: string
          display_name: string | null
          id: string
          is_admin: boolean
          is_online: boolean
          last_seen: string
          permissions: DbUserPermissions | null
          unlocked_themes: string[]
          updated_at: string
          username: string
          yen_balance: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          card_back_theme?: string
          card_front_theme?: string
          clan_title?: string | null
          coin_theme?: string
          created_at?: string
          dice_theme?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          is_online?: boolean
          last_seen?: string
          permissions?: Partial<DbUserPermissions> | null
          unlocked_themes?: string[]
          updated_at?: string
          username: string
          yen_balance?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          card_back_theme?: string
          card_front_theme?: string
          clan_title?: string | null
          coin_theme?: string
          created_at?: string
          dice_theme?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_online?: boolean
          last_seen?: string
          permissions?: Partial<DbUserPermissions> | null
          unlocked_themes?: string[]
          updated_at?: string
          username?: string
          yen_balance?: number
        }
        Relationships: []
      }
      rankings: {
        Row: {
          draws: number
          game_slug: string
          id: string
          losses: number
          rating: number
          user_id: string
          wins: number
        }
        Insert: {
          draws?: number
          game_slug: string
          id?: string
          losses?: number
          rating?: number
          user_id: string
          wins?: number
        }
        Update: {
          draws?: number
          game_slug?: string
          id?: string
          losses?: number
          rating?: number
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          joined_at: string
          ready: boolean
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          ready?: boolean
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          ready?: boolean
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yen_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          recipient_id: string | null
          sender_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          transaction_type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      blackjack_action_type: "deal" | "hit" | "stand" | "reset"
      blackjack_player_state: "waiting" | "playing" | "done"
      blackjack_status:
        | "waiting"
        | "dealing"
        | "player_turn"
        | "dealer_turn"
        | "settlement"
        | "finished"
      friend_status: "pending" | "accepted" | "rejected" | "cancelled"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      room_state: "waiting" | "ready" | "playing" | "finished" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      blackjack_action_type: ["deal", "hit", "stand", "reset"],
      blackjack_player_state: ["waiting", "playing", "done"],
      blackjack_status: [
        "waiting",
        "dealing",
        "player_turn",
        "dealer_turn",
        "settlement",
        "finished",
      ],
      friend_status: ["pending", "accepted", "rejected", "cancelled"],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      room_state: ["waiting", "ready", "playing", "finished", "cancelled"],
    },
  },
} as const
