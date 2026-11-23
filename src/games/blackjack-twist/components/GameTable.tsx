import { Eye, EyeOff, Coins } from 'lucide-react'
import { ThemedCard } from '../../_shared/components'
import type { PlayerCardThemeSelection } from '../../_shared/useGenericGame'
import { formatYen } from '@/services/wallet/walletService'
import type { TwistPlayer, TwistState } from '../engine/twistEngine'
import { PlayerArea } from './PlayerArea'

interface GameTableProps {
  gameState: TwistState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
  playerThemes?: Record<string, PlayerCardThemeSelection>
  potYen?: number
}

export function GameTable({
  gameState,
  currentUserId,
  playerProfiles,
  playerThemes = {},
  potYen = 0,
}: GameTableProps) {
  const players = Object.values(gameState.playersRecord) as TwistPlayer[]
  const isFinished = gameState.status === 'result' || gameState.status === 'finished'
  const hostTheme = players[0] ? playerThemes[players[0].userId] : undefined

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-6 max-w-5xl mx-auto w-full bg-engei-pattern">
      {/* Shared Hidden Card */}
      <div className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-gold-500/25 bg-surface-900/80 backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
          {gameState.sharedRevealed ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
          <span>Shared Mystery Card</span>
          {potYen > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/35 text-gold-300 font-mono text-[11px]">
              <Coins className="size-3" aria-hidden="true" />
              Pot : {formatYen(potYen)}
            </span>
          )}
        </div>

        {gameState.sharedHiddenCard && (
          <ThemedCard
            suit={gameState.sharedHiddenCard.suit}
            rank={gameState.sharedHiddenCard.rank}
            isHidden={!gameState.sharedRevealed}
            frontThemeId={hostTheme?.frontThemeId}
            backThemeId={hostTheme?.backThemeId}
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
        <div className="w-full rounded-2xl border border-gold-400/50 bg-amber-950/35 p-5 text-center animate-slide-up space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gold-300">
            {gameState.winnerId === 'draw'
              ? 'Draw Game!'
              : gameState.winnerId === currentUserId
                ? 'Victory! You won!'
                : `${playerProfiles[gameState.winnerId ?? '']?.displayName ?? 'Opponent'} Won!`}
          </h2>
          {potYen > 0 && (
            <p className="text-sm font-mono text-gold-200">
              {gameState.winnerId === 'draw'
                ? 'Égalité — mise remboursée à chaque joueur.'
                : `Pot remporté : +${formatYen(potYen)}`}
            </p>
          )}
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
            playerThemes={playerThemes}
          />
        ))}
      </div>
    </div>
  )
}
