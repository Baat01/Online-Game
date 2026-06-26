import { supabase } from '@/lib/supabase'

export interface Ranking {
  id: string
  user_id: string
  game_slug: string
  rating: number
  wins: number
  losses: number
  draws: number
  profiles: {
    username: string
    avatar_url: string | null
  }
}

export async function getLeaderboard(gameSlug: string, limit = 50): Promise<Ranking[]> {
  const { data, error } = await supabase
    .from('rankings')
    .select(`
      *,
      profiles(username, avatar_url)
    `)
    .eq('game_slug', gameSlug)
    .order('rating', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as unknown as Ranking[]
}

export async function getUserRankings(userId: string): Promise<Ranking[]> {
  const { data, error } = await supabase
    .from('rankings')
    .select(`
      *,
      profiles(username, avatar_url)
    `)
    .eq('user_id', userId)
    .order('rating', { ascending: false })

  if (error) throw error
  return data as unknown as Ranking[]
}

export async function getMatchHistory(userId: string, limit = 20) {
  // `players` is a jsonb array of user_ids. We can query using the @> operator in postgres
  // But Supabase JS provides .contains() for JSONB arrays
  const { data, error } = await supabase
    .from('game_history')
    .select('*')
    .contains('players', [userId])
    .order('ended_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
