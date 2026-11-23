import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createLocalSupabaseClient } from './localSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !String(supabaseUrl).includes('your-project-ref') &&
  !String(supabaseAnonKey).startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')

export const isLocalDemoMode = !isConfigured

/**
 * Typed Supabase client.
 * Uses the live Supabase client when environment variables are configured,
 * and falls back to the local cross-tab demo engine for zero-config local runs.
 */
export const supabase = isConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createLocalSupabaseClient()
