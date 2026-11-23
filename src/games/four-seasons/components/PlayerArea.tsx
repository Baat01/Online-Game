import { clsx } from 'clsx'
import { AlertCircle } from 'lucide-react'
import { ThemedCard } from '../../_shared/components'
import type { PlayerCardThemeSelection } from '../../_shared/useGenericGame'
import type { Card, Suit } from '../../_shared/deck'
import {
  canPlayCard,
  isFaceCard,
  SEASON_META,
  type FourSeasonsPlayer,
} from '../engine/fourSeasonsEngine'

interface PlayerAreaProps {
  player: FourSeasonsPlayer
  displayName: string
  isMe: boolean
  isCurrentTurn: boolean
  activeSeason: Suit
  hasPendingKing: boolean
  playerTheme?: PlayerCardThemeSelection
  onPlayCard: (cardId: string) => void
}

export function PlayerArea({
  player,
  displayName,
  isMe,
  isCurrentTurn,
  activeSeason,
  hasPendingKing,
  playerTheme,
  onPlayCard,
}: PlayerAreaProps) {
  if (!isMe) {
    return (
      <section
        className={clsx(
          'w-full max-w-3xl rounded-2xl border p-4 transition-all flex items-center justify-between gap-4',
          isCurrentTurn
            ? 'border-gold-400 bg-surface-800/90 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
            : 'border-surface-700 bg-surface-900/75',
        )}
      >
        <div>
          <h2 className="text-sm font-bold text-white">{displayName}</h2>
          <p className="text-xs text-slate-400">
            {player.hand.length} {player.hand.length === 1 ? 'card' : 'cards'} remaining
          </p>
        </div>

        <div className="flex -space-x-3">
          {player.hand.map((c) => (
            <ThemedCard
              key={c.id}
              isHidden
              size="sm"
              frontThemeId={playerTheme?.frontThemeId}
              backThemeId={playerTheme?.backThemeId}
            />
          ))}
        </div>
      </section>
    )
  }

  const isLastCard = player.hand.length === 1
  const onlyFaceCardLeft = isLastCard && player.hand[0] && isFaceCard(player.hand[0])

  return (
    <section
      className={clsx(
        'w-full max-w-4xl rounded-2xl border p-5 transition-all space-y-4',
        isCurrentTurn
          ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
          : 'border-slate-800 bg-surface-900/75',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white">{displayName} (You)</h2>
          {isCurrentTurn && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
              Your Turn
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {player.hand.length} {player.hand.length === 1 ? 'card' : 'cards'} in hand
        </span>
      </div>

      {onlyFaceCardLeft && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-lg px-3 py-2">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>
            You cannot end the game with a face card ({player.hand[0].rank}). Draw a card!
          </span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 min-h-[8.5rem] items-center">
        {player.hand.map((card: Card) => {
          const playable =
            isCurrentTurn &&
            !hasPendingKing &&
            canPlayCard(card, activeSeason, isLastCard)
          const season = SEASON_META[card.suit]

          return (
            <ThemedCard
              key={card.id}
              suit={card.suit}
              rank={card.rank}
              size="md"
              seasonLabel={season.name}
              frontThemeId={playerTheme?.frontThemeId}
              backThemeId={playerTheme?.backThemeId}
              playable={playable}
              disabled={!playable}
              onClick={() => playable && onPlayCard(card.id)}
              ariaLabel={`Play ${card.rank} of ${card.suit} (${season.name})`}
            />
          )
        })}
      </div>
    </section>
  )
}
