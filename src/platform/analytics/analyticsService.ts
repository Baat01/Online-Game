import { supabase } from '@/lib/supabase'

export interface PlatformAnalytics {
  totalGamesPlayed: number;
  averageDuration: number;
  mostPlayedGame: string | null;
  completionRate: number; // percentage of games that ended with a winner vs draws/disconnects
}

/**
 * Computes platform analytics dynamically from the game_history table.
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const { data, error } = await supabase
    .from('game_history')
    .select('game_slug, winner_id, duration')

  if (error) throw error
  if (!data || data.length === 0) {
    return {
      totalGamesPlayed: 0,
      averageDuration: 0,
      mostPlayedGame: null,
      completionRate: 0
    }
  }

  let totalDuration = 0
  let completedWithWinner = 0
  const gameCounts: Record<string, number> = {}

  for (const game of data) {
    if (game.duration) totalDuration += game.duration
    if (game.winner_id) completedWithWinner++
    
    gameCounts[game.game_slug] = (gameCounts[game.game_slug] || 0) + 1
  }

  let mostPlayed = null
  let maxCount = 0
  for (const [slug, count] of Object.entries(gameCounts)) {
    if (count > maxCount) {
      maxCount = count
      mostPlayed = slug
    }
  }

  return {
    totalGamesPlayed: data.length,
    averageDuration: data.length > 0 ? Math.round(totalDuration / data.length) : 0,
    mostPlayedGame: mostPlayed,
    completionRate: data.length > 0 ? Math.round((completedWithWinner / data.length) * 100) : 0
  }
}
