import type { User } from '@supabase/supabase-js'

/**
 * Auth-related types.
 * Kept separate from database.ts to avoid coupling Supabase internals to app code.
 */

/** Slim wrapper around Supabase User — the parts the app actually needs */
export interface AuthUser {
  id: string
  email: string
}

/** Shape of the public.profiles row */
export interface Profile {
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

/** Shape of the public.presence row */
export interface Presence {
  user_id: string
  is_online: boolean
  last_seen: string
}

/** The full auth state exposed by AuthContext */
export interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  /** True while the initial session is being restored from storage */
  loading: boolean
  error: string | null
}

/**
 * Converts a Supabase User to our slim AuthUser.
 * Throws if the user has no email (shouldn't happen with email auth).
 */
export function toAuthUser(user: User): AuthUser {
  if (!user.email) throw new Error('User has no email')
  return { id: user.id, email: user.email }
}
