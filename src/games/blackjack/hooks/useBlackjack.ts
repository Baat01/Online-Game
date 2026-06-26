import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blackjackService } from '../services/blackjackService'
import { useAuth } from '@/hooks/useAuth'

export const blackjackKeys = {
  all: ['blackjack'] as const,
  game: (roomId: string) => [...blackjackKeys.all, 'game', roomId] as const,
}

export function useBlackjack(roomId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Load Game Query
  const { data, isLoading: loading } = useQuery({
    queryKey: blackjackKeys.game(roomId),
    queryFn: () => blackjackService.loadGame(roomId),
    enabled: !!roomId,
  })

  const game = data?.game ?? null
  const players = data?.players ?? []
  
  const myPlayer = players.find(p => p.user_id === user?.id)
  const myTurn = game?.current_turn === user?.id

  // Mutations
  const createGameMutation = useMutation({
    mutationFn: (userIds: string[]) => blackjackService.createGame(roomId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blackjackKeys.game(roomId) })
    },
  })

  const startMutation = useMutation({
    mutationFn: () => {
      if (!game || !players.length) throw new Error('Game not loaded')
      return blackjackService.startRound(game, players)
    },
  })

  const hitMutation = useMutation({
    mutationFn: () => {
      if (!game || !user) throw new Error('Cannot hit')
      return blackjackService.hit(game.id, user.id)
    },
  })

  const standMutation = useMutation({
    mutationFn: () => {
      if (!game || !user) throw new Error('Cannot stand')
      return blackjackService.stand(game.id, user.id)
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!game) throw new Error('Game not loaded')
      return blackjackService.resetRound(game.id)
    },
  })

  return {
    game,
    players,
    myPlayer,
    myTurn,
    loading,
    createGame: createGameMutation.mutateAsync,
    start: startMutation.mutateAsync,
    hit: hitMutation.mutateAsync,
    stand: standMutation.mutateAsync,
    reset: resetMutation.mutateAsync,
    isPending: createGameMutation.isPending || startMutation.isPending || hitMutation.isPending || standMutation.isPending || resetMutation.isPending
  }
}
