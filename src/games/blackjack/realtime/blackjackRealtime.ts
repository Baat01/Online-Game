import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { blackjackKeys } from '../hooks/useBlackjack'

export function useBlackjackRealtime(roomId: string, gameId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!roomId) return

    // Re-fetch helper
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: blackjackKeys.game(roomId) })
    }

    const channel = supabase.channel(`blackjack:${roomId}`)

    // Listen to changes on blackjack_games
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'blackjack_games', filter: `room_id=eq.${roomId}` },
      invalidate
    )

    // Listen to changes on blackjack_players (only if gameId is known)
    if (gameId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blackjack_players', filter: `game_id=eq.${gameId}` },
        invalidate
      )

      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blackjack_actions', filter: `game_id=eq.${gameId}` },
        (_payload) => {
          // Could trigger animations here based on payload.new.type
          invalidate()
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, gameId, queryClient])
}
