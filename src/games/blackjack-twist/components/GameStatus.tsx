import { Sparkles, ArrowLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CardThemeSelector } from '../../_shared/components'
import type { TwistState } from '../engine/twistEngine'

interface GameStatusProps {
  gameState: TwistState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
  onBackToLobby: () => void
}

export function GameStatus({
  gameState,
  currentUserId,
  playerProfiles,
  onBackToLobby,
}: GameStatusProps) {
  const isFinished = gameState.status === 'result' || gameState.status === 'finished'
  const turnText = isFinished
    ? 'Showdown Complete'
    : gameState.currentTurnUserId === currentUserId
      ? 'Your Turn'
      : `${playerProfiles[gameState.currentTurnUserId ?? '']?.displayName ?? 'Opponent'}'s Turn`

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-900/80 border-b border-fuchsia-500/20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 flex items-center justify-center">
          <Sparkles className="size-5 text-fuchsia-300" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Blackjack Twist</h1>
          <p className="text-xs text-slate-400">
            <span className="text-fuchsia-300 font-medium">{turnText}</span>
            {' · '}
            <span className="inline-flex items-center gap-1">
              <Layers className="size-3 inline" aria-hidden="true" />
              {gameState.deck.length} left
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CardThemeSelector compact />
        <Button
          size="sm"
          variant="ghost"
          onClick={onBackToLobby}
          leftIcon={<ArrowLeft className="size-3.5" />}
        >
          Lobby
        </Button>
      </div>
    </header>
  )
}
