import { CloudRain, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { CardThemeSelector } from '../../_shared/components'
import type { Suit } from '../../_shared/deck'
import { SEASON_META, type FourSeasonsState } from '../engine/fourSeasonsEngine'

interface GameStatusProps {
  gameState: FourSeasonsState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
  onBackToLobby: () => void
}

const SEASON_SEQUENCE: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs']

export function GameStatus({
  gameState,
  currentUserId,
  playerProfiles,
  onBackToLobby,
}: GameStatusProps) {
  const activeMeta = SEASON_META[gameState.activeSeason]
  const turnText =
    gameState.status === 'finished'
      ? 'Match Finished'
      : gameState.currentTurnUserId === currentUserId
        ? 'Your Turn'
        : `${playerProfiles[gameState.currentTurnUserId ?? '']?.displayName ?? 'Opponent'}'s Turn`

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-900/80 border-b border-emerald-500/20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
          <CloudRain className="size-5 text-emerald-300" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Four Seasons</h1>
          <p className="text-xs text-slate-400">
            <span className="text-emerald-300 font-medium">{turnText}</span>
            {' · '}
            <span>
              Season: {activeMeta.emoji} {activeMeta.name}
            </span>
          </p>
        </div>
      </div>

      {/* Seasonal Cycle Indicator */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-800/80 border border-surface-700 text-xs">
        {SEASON_SEQUENCE.map((suit, i) => {
          const meta = SEASON_META[suit]
          const active = gameState.activeSeason === suit
          return (
            <span key={suit} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-slate-600 mx-0.5">→</span>}
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full border transition-all',
                  active
                    ? meta.badgeClass
                    : 'border-transparent text-slate-500',
                )}
              >
                {meta.emoji} {meta.name}
              </span>
            </span>
          )
        })}
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
