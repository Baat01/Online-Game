import { Button } from '@/components/ui/Button'
import type { BlackjackGame, BlackjackPlayer } from '../types/blackjack'
import { canHit, canStand } from '../engine/blackjackEngine'

interface Props {
  game: BlackjackGame
  player: BlackjackPlayer | undefined
  isMyTurn: boolean
  onHit: () => void
  onStand: () => void
  isPending: boolean
}

export function ActionBar({ game, player, isMyTurn, onHit, onStand, isPending }: Props) {
  if (!player) return null
  if (game.status !== 'player_turn') return null
  if (!isMyTurn) {
    return (
      <div className="flex justify-center p-4">
        <p className="text-white/50 text-sm animate-pulse">Waiting for other players...</p>
      </div>
    )
  }

  const hitAllowed = canHit(player, game)
  const standAllowed = canStand(player, game)

  if (!hitAllowed && !standAllowed) return null

  return (
    <div className="flex items-center justify-center gap-4 p-4 animate-slide-up">
      <Button
        variant="secondary"
        size="lg"
        onClick={onStand}
        disabled={!standAllowed || isPending}
        className="w-32"
      >
        Stand
      </Button>
      
      <Button
        variant="primary"
        size="lg"
        onClick={onHit}
        disabled={!hitAllowed || isPending}
        className="w-32 bg-green-600 hover:bg-green-500 border-green-500"
      >
        Hit
      </Button>
    </div>
  )
}
