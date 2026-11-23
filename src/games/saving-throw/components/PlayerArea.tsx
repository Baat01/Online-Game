import { clsx } from 'clsx'
import { Crown, Target } from 'lucide-react'
import { AnimatedDice } from '../../_shared/components'
import type { SavingThrowPlayer } from '../engine/savingThrowEngine'

interface PlayerAreaProps {
  player: SavingThrowPlayer
  displayName: string
  isMe: boolean
  isCurrentTurn: boolean
  isRoundWinner: boolean
  targetToBeat: number | null
  diceThemeId?: string
}

export function PlayerArea({
  player,
  displayName,
  isMe,
  isCurrentTurn,
  isRoundWinner,
  targetToBeat,
  diceThemeId,
}: PlayerAreaProps) {
  const roleLabel =
    player.role === 'first'
      ? 'First Roller'
      : player.role === 'second'
        ? 'Second (Must Roll Lower)'
        : 'Waiting'

  return (
    <section
      className={clsx(
        'flex-1 rounded-2xl border p-5 transition-all duration-200 flex flex-col items-center gap-4',
        isRoundWinner
          ? 'border-emerald-400/70 bg-emerald-950/30 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
          : isCurrentTurn
            ? 'border-indigo-400 bg-indigo-950/40 shadow-[0_0_24px_rgba(99,102,241,0.25)]'
            : 'border-slate-800 bg-surface-900/70',
      )}
    >
      {/* Identity + Wins */}
      <div className="w-full flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              {isMe ? `${displayName} (You)` : displayName}
            </h2>
            {isCurrentTurn && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/25 text-indigo-300 border border-indigo-400/40">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
        </div>

        {/* Win pips (first to 3) */}
        <div className="flex items-center gap-1.5" aria-label={`${player.wins} of 3 wins`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={clsx(
                'size-3.5 rounded-full border transition-colors',
                i < player.wins
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'bg-surface-800 border-surface-600',
              )}
            />
          ))}
        </div>
      </div>

      {/* Target callout for second player */}
      {player.role === 'second' && targetToBeat !== null && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-medium">
          <Target className="size-3.5 text-amber-300" aria-hidden="true" />
          Target: score strictly below <strong>{targetToBeat}</strong>
        </div>
      )}

      {/* 2d10 Animated Dice */}
      <AnimatedDice
        tens={player.tensDie}
        units={player.unitsDie}
        combinedScore={player.finalScore ?? (player.hasRolled ? player.score : null)}
        hasRerolled={player.hasRerolled}
        rollKey={`${player.userId}-${player.rollCount}`}
        highlightWinner={isRoundWinner}
        diceThemeId={diceThemeId}
        targetScore={player.role === 'second' ? targetToBeat : null}
      />

      {/* Round / Lock status */}
      <div className="h-6 flex items-center justify-center">
        {isRoundWinner ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
            <Crown className="size-3.5" aria-hidden="true" />
            Round Winner!
          </span>
        ) : player.finalScore !== null ? (
          <span className="text-xs font-medium text-slate-400">Score locked in</span>
        ) : player.hasRolled ? (
          <span className="text-xs font-medium text-indigo-300">
            {player.hasRerolled ? 'Final roll' : 'Keep or reroll both dice'}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Ready to roll</span>
        )}
      </div>
    </section>
  )
}
