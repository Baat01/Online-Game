import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/auth'

/**
 * Auth Service — all Supabase auth calls live here.
 *
 * Rules:
 * - No UI logic, no React, no hooks
 * - Throws on error so callers (AuthContext) can handle UX
 * - Returns typed domain objects, not raw Supabase responses
 */

// ─────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────

/**
 * Returns the current active session, or null if unauthenticated.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function to call on cleanup.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

// ─────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────

/**
 * Fetch a user's profile from the public.profiles table.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // PGRST116 = no rows found — not an error in our domain
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as Profile
}

// ─────────────────────────────────────────────
// Auth Operations
// ─────────────────────────────────────────────

/**
 * Register a new user.
 * Supabase triggers `handle_new_user` which creates the profile row automatically.
 * We pass the username via user_metadata so the trigger can use it.
 */
export async function signUp(
  email: string,
  password: string,
  username: string,
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })
  if (error) throw error
}

/**
 * Sign in with email + password.
 */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Sign out the current user globally (invalidates all sessions).
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) throw error
}
