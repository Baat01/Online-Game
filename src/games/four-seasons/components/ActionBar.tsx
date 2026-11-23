import { PlusSquare, Crown, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Suit } from '../../_shared/deck'
import { SEASON_META, type FourSeasonsState } from '../engine/fourSeasonsEngine'

interface ActionBarProps {
  gameState: FourSeasonsState
  isMyTurn: boolean
  isHost: boolean
  isUpdating: boolean
  pendingKingCardId: string | null
  onDrawCard: () => void
  onSelectKingSeason: (season: Suit) => void
  onCancelKing: () => void
  onRematch: () => void
  onBackToLobby: () => void
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs']

export function ActionBar({
  gameState,
  isMyTurn,
  isHost,
  isUpdating,
  pendingKingCardId,
  onDrawCard,
  onSelectKingSeason,
  onCancelKing,
  onRematch,
  onBackToLobby,
}: ActionBarProps) {
  const isFinished = gameState.status === 'finished'

  return (
    <div className="px-4 py-4 bg-surface-900/90 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
      {!isFinished && isMyTurn && pendingKingCardId && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-surface-800 px-4 py-3 rounded-2xl border border-emerald-400/50">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white mr-2">
            <Crown className="size-4 text-amber-300" aria-hidden="true" />
            Choose Active Season:
          </span>
          {SUITS.map((suit) => (
            <Button
              key={suit}
              size="sm"
              variant="secondary"
              onClick={() => onSelectKingSeason(suit)}
              isLoading={isUpdating}
            >
              {SEASON_META[suit].emoji} {SEASON_META[suit].name}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelKing}
            aria-label="Cancel King selection"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {!isFinished && isMyTurn && !pendingKingCardId && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <p className="text-xs text-slate-400 hidden sm:block">
            Click a highlighted card in your hand to play, or draw 1 card:
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={onDrawCard}
            isLoading={isUpdating}
            leftIcon={<PlusSquare className="size-4" />}
          >
            Draw 1 Card
          </Button>
        </div>
      )}

      {!isFinished && !isMyTurn && (
        <p className="text-sm text-slate-400 animate-pulse">Waiting for opponent&apos;s move...</p>
      )}

      {isFinished && (
        <>
          {isHost && (
            <Button
              variant="primary"
              size="lg"
              onClick={onRematch}
              isLoading={isUpdating}
              leftIcon={<RotateCcw className="size-4" />}
            >
              Play Again
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={onBackToLobby}>
            Back to Room
          </Button>
        </>
      )}
    </div>
  )
}
