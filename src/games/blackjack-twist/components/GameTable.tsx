import { Eye, EyeOff } from 'lucide-react'
import { ThemedCard } from '../../_shared/components'
import type { TwistPlayer, TwistState } from '../engine/twistEngine'
import { PlayerArea } from './PlayerArea'

interface GameTableProps {
  gameState: TwistState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
}

export function GameTable({ gameState, currentUserId, playerProfiles }: GameTableProps) {
  const players = Object.values(gameState.playersRecord) as TwistPlayer[]
  const isFinished = gameState.status === 'result' || gameState.status === 'finished'

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-6 max-w-5xl mx-auto w-full">
      {/* Shared Hidden Card */}
      <div className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-white/10 bg-surface-900/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
          {gameState.sharedRevealed ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
          <span>Shared Mystery Card</span>
        </div>

        {gameState.sharedHiddenCard && (
          <ThemedCard
            suit={gameState.sharedHiddenCard.suit}
            rank={gameState.sharedHiddenCard.rank}
            isHidden={!gameState.sharedRevealed}
            size="md"
          />
        )}

        <p className="text-xs text-slate-400 text-center max-w-xs">
          {gameState.sharedRevealed
            ? `Revealed: ${gameState.sharedHiddenCard?.rank} of ${gameState.sharedHiddenCard?.suit} — applied to both players' scores.`
            : 'Applies to BOTH players when the round ends!'}
        </p>
      </div>

      {/* Final Result Banner */}
      {isFinished && (
        <div className="w-full rounded-2xl border border-amber-400/50 bg-amber-950/35 p-5 text-center animate-slide-up">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300">
            {gameState.winnerId === 'draw'
              ? 'Draw Game!'
              : gameState.winnerId === currentUserId
                ? 'Victory! You won!'
                : `${playerProfiles[gameState.winnerId ?? '']?.displayName ?? 'Opponent'} Won!`}
          </h2>
        </div>
      )}

      {/* Players Area */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
        {players.map((p) => (
          <PlayerArea
            key={p.userId}
            player={p}
            displayName={playerProfiles[p.userId]?.displayName ?? 'Player'}
            isMe={p.userId === currentUserId}
            isCurrentTurn={!isFinished && gameState.currentTurnUserId === p.userId}
            isWinner={isFinished && gameState.winnerId === p.userId}
          />
        ))}
      </div>
    </div>
  )
}
