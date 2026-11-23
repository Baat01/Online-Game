import { Dices, ArrowLeft, Trophy, Coins } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatYen } from '@/services/wallet/walletService'
import { GameRulesButton } from '../../_shared/components'
import type { SavingThrowState } from '../engine/savingThrowEngine'

interface GameStatusProps {
  gameState: SavingThrowState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
  potYen?: number
  onBackToLobby: () => void
}

export function GameStatus({
  gameState,
  currentUserId,
  playerProfiles,
  potYen = 0,
  onBackToLobby,
}: GameStatusProps) {
  const players = Object.values(gameState.playersRecord)
  const turnName = gameState.currentTurnUserId
    ? gameState.currentTurnUserId === currentUserId
      ? 'Your Turn'
      : `${playerProfiles[gameState.currentTurnUserId]?.displayName ?? 'Opponent'}'s Turn`
    : gameState.status === 'waiting'
      ? 'Opening Coin Flip'
      : gameState.tiebreakerActive
        ? 'Tiebreaker Coin Flip'
        : gameState.status === 'finished'
          ? 'Match Complete'
          : 'Round Complete'

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-900/80 border-b border-indigo-500/20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
          <Dices className="size-5 text-indigo-300" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Saving Throw</h1>
          <p className="text-xs text-slate-400">
            Best of 5 · Round {gameState.roundNumber} ·{' '}
            <span className="text-indigo-300 font-medium">{turnName}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {potYen > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/35 text-gold-300 font-mono text-xs font-semibold">
            <Coins className="size-3.5" aria-hidden="true" />
            Pot : {formatYen(potYen)}
          </div>
        )}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-800 border border-surface-700 text-xs">
          <Trophy className="size-3.5 text-amber-400" aria-hidden="true" />
          {players.map((p, idx) => (
            <span key={p.userId} className="text-slate-200 font-semibold">
              {idx > 0 && <span className="text-slate-600 mx-1.5">vs</span>}
              {p.userId === currentUserId ? 'You' : playerProfiles[p.userId]?.displayName ?? 'Opp'}:{' '}
              <span className="text-amber-300">{p.wins}/3</span>
            </span>
          ))}
        </div>

        <GameRulesButton gameSlug="saving-throw" />
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
