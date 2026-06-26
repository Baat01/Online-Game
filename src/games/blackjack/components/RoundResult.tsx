import { settle } from '../engine/blackjackEngine'
import type { BlackjackGame, BlackjackPlayer } from '../types/blackjack'
import { Button } from '@/components/ui/Button'
import { RefreshCcw } from 'lucide-react'

interface Props {
  game: BlackjackGame
  player: BlackjackPlayer | undefined
  isHost: boolean
  onReset: () => void
  isPending: boolean
}

export function RoundResult({ game, player, isHost, onReset, isPending }: Props) {
  if (game.status !== 'settlement' && game.status !== 'finished') return null

  let message = 'Round Over'
  let color = 'text-white'

  if (player) {
    const result = settle(player, game.dealer_score)
    switch (result) {
      case 'win_blackjack':
        message = 'Blackjack! You Win!'
        color = 'text-yellow-400'
        break
      case 'win':
        message = 'You Win!'
        color = 'text-green-400'
        break
      case 'push':
        message = 'Push (Tie)'
        color = 'text-slate-300'
        break
      case 'lose_bust':
        message = 'Bust! You Lose.'
        color = 'text-red-400'
        break
      case 'lose':
        message = 'Dealer Wins.'
        color = 'text-red-400'
        break
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-4 animate-slide-up">
      <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-widest ${color}`}>
        {message}
      </h2>
      
      {isHost && (
        <Button
          variant="primary"
          size="lg"
          onClick={onReset}
          isLoading={isPending}
          leftIcon={<RefreshCcw className="w-5 h-5" />}
          className="mt-4"
        >
          Next Round
        </Button>
      )}
      {!isHost && (
        <p className="text-white/50 text-sm mt-4 animate-pulse">Waiting for host to start next round...</p>
      )}
    </div>
  )
}
