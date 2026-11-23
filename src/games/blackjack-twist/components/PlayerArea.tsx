import { clsx } from 'clsx'
import { ThemedCard } from '../../_shared/components'
import type { PlayerCardThemeSelection } from '../../_shared/useGenericGame'
import type { TwistPlayer } from '../engine/twistEngine'

interface PlayerAreaProps {
  player: TwistPlayer
  displayName: string
  isMe: boolean
  isCurrentTurn: boolean
  isWinner: boolean
  playerThemes?: Record<string, PlayerCardThemeSelection>
}

export function PlayerArea({
  player,
  displayName,
  isMe,
  isCurrentTurn,
  isWinner,
  playerThemes = {},
}: PlayerAreaProps) {
  return (
    <section
      className={clsx(
        'flex-1 rounded-2xl border p-5 transition-all duration-200 flex flex-col gap-4',
        isWinner
          ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
          : isCurrentTurn
            ? 'border-fuchsia-400 bg-fuchsia-950/35 shadow-[0_0_24px_rgba(217,70,239,0.2)]'
            : 'border-slate-800 bg-surface-900/75',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">
            {isMe ? `${displayName} (You)` : displayName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {isCurrentTurn && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-400/40">
                Active Turn
              </span>
            )}
            {player.busted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-400/40">
                Busted
              </span>
            )}
            {player.hasStood && !player.busted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                Standing
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Score</p>
          <p
            className={clsx(
              'text-2xl font-mono font-extrabold',
              player.busted
                ? 'text-rose-400'
                : player.score === 21
                  ? 'text-amber-300'
                  : 'text-white',
            )}
          >
            {player.score}
          </p>
        </div>
      </div>

      {/* Hand */}
      <div className="flex flex-wrap gap-2.5 min-h-[7.5rem] items-center">
        {player.hand.map((card, i) => {
          const cardOwnerId = card.ownerId ?? player.userId
          const ownerTheme = playerThemes[cardOwnerId]
          return (
            <ThemedCard
              key={`${card.id}-${i}`}
              suit={card.suit}
              rank={card.rank}
              size="sm"
              modifierBadge={card.effectLabel}
              frontThemeId={ownerTheme?.frontThemeId}
              backThemeId={ownerTheme?.backThemeId}
              className="animate-deal-card"
            />
          )
        })}
      </div>
    </section>
  )
}
