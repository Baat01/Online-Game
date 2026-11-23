import { AnimatedCoinFlip } from '../../_shared/components'
import { formatYen } from '@/services/wallet/walletService'
import type { SavingThrowPlayer, SavingThrowState } from '../engine/savingThrowEngine'
import { PlayerArea } from './PlayerArea'

interface GameTableProps {
  gameState: SavingThrowState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
  potYen?: number
}

export function GameTable({
  gameState,
  currentUserId,
  playerProfiles,
  potYen = 0,
}: GameTableProps) {
  const players = Object.values(gameState.playersRecord) as SavingThrowPlayer[]
  const firstPlayer = players.find((p) => p.role === 'first')
  const targetToBeat = firstPlayer?.finalScore ?? null

  if (gameState.status === 'waiting' || gameState.tiebreakerActive) {
    const challengerName =
      gameState.challengerId === currentUserId
        ? 'You'
        : playerProfiles[gameState.challengerId ?? '']?.displayName ?? 'Challenger'

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-surface-900/80 p-8 space-y-5 shadow-xl">
          <h2 className="text-2xl font-bold text-amber-300">
            {gameState.tiebreakerActive ? 'Sudden Death Tiebreaker!' : 'Opening Coin Flip'}
          </h2>
          <p className="text-sm text-slate-300">
            {gameState.tiebreakerActive
              ? `${challengerName} calls Heads or Tails to decide the match winner!`
              : `${challengerName} calls the coin flip to determine who rolls first in Round 1.`}
          </p>
          <AnimatedCoinFlip
            choice={gameState.coinChoice}
            result={gameState.coinResult}
            label={
              gameState.challengerId === currentUserId
                ? 'Choose Heads or Tails below'
                : `Waiting for ${challengerName} to flip...`
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-6 max-w-4xl mx-auto w-full">
      {/* Match finished banner */}
      {gameState.status === 'finished' && (
        <div className="w-full rounded-2xl border border-emerald-400/50 bg-emerald-950/40 p-6 text-center space-y-3 animate-slide-up">
          <h2 className="text-3xl font-extrabold text-emerald-300">
            {gameState.gameWinnerId === currentUserId
              ? 'Victory! You won the match!'
              : `${playerProfiles[gameState.gameWinnerId ?? '']?.displayName ?? 'Opponent'} won the match!`}
          </h2>
          {potYen > 0 && (
            <p className="text-sm font-mono text-gold-300">
              Pot remporté : +{formatYen(potYen)}
            </p>
          )}
          {gameState.coinResult && (
            <AnimatedCoinFlip
              choice={gameState.coinChoice}
              result={gameState.coinResult}
              label="Deciding coin flip"
            />
          )}
        </div>
      )}

      {/* Round result summary */}
      {gameState.status === 'result' && (
        <div className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-center animate-fade-in">
          <p className="text-lg font-bold text-amber-300">
            {gameState.roundWinnerId === currentUserId
              ? `You won Round ${gameState.roundNumber}!`
              : `${playerProfiles[gameState.roundWinnerId ?? '']?.displayName ?? 'Opponent'} won Round ${gameState.roundNumber}!`}
          </p>
        </div>
      )}

      {/* Players grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
        {players.map((p) => (
          <PlayerArea
            key={p.userId}
            player={p}
            displayName={playerProfiles[p.userId]?.displayName ?? 'Player'}
            isMe={p.userId === currentUserId}
            isCurrentTurn={gameState.currentTurnUserId === p.userId}
            isRoundWinner={
              (gameState.status === 'result' || gameState.status === 'finished') &&
              gameState.roundWinnerId === p.userId
            }
            targetToBeat={p.role === 'second' ? targetToBeat : null}
          />
        ))}
      </div>
    </div>
  )
}
