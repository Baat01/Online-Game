import { Sparkles, Hand, ShieldAlert, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemedCard } from '../../_shared/components'
import type { TwistPlayer, TwistState } from '../engine/twistEngine'

interface ActionBarProps {
  gameState: TwistState
  myPlayer: TwistPlayer | null
  isMyTurn: boolean
  isHost: boolean
  isUpdating: boolean
  onDraw: () => void
  onStand: () => void
  onResolveFaceCard: (action: 'take' | 'give', kingChoice?: '+3' | '-3') => void
  onRematch: () => void
  onBackToLobby: () => void
}

export function ActionBar({
  gameState,
  myPlayer,
  isMyTurn,
  isHost,
  isUpdating,
  onDraw,
  onStand,
  onResolveFaceCard,
  onRematch,
  onBackToLobby,
}: ActionBarProps) {
  const isFinished = gameState.status === 'result' || gameState.status === 'finished'
  const pending = gameState.pendingCard

  return (
    <div className="px-4 py-4 bg-surface-900/90 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4">
      {!isFinished && isMyTurn && myPlayer && !myPlayer.hasStood && !myPlayer.busted && (
        pending ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-800/95 px-5 py-4 rounded-2xl border border-fuchsia-400/60 shadow-lg">
            <ThemedCard suit={pending.suit} rank={pending.rank} size="sm" />
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                <Sparkles className="size-4 text-fuchsia-300" aria-hidden="true" />
                Face Card Drawn ({pending.rank}) — Choose your play:
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onResolveFaceCard('take')}
                  isLoading={isUpdating}
                >
                  Take (+10)
                </Button>

                {pending.rank === 'J' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onResolveFaceCard('give')}
                    isLoading={isUpdating}
                    leftIcon={<ShieldAlert className="size-3.5" />}
                  >
                    Give Opponent (-3)
                  </Button>
                )}

                {pending.rank === 'Q' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onResolveFaceCard('give')}
                    isLoading={isUpdating}
                    leftIcon={<ShieldAlert className="size-3.5" />}
                  >
                    Give Opponent (+3)
                  </Button>
                )}

                {pending.rank === 'K' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onResolveFaceCard('give', '+3')}
                      isLoading={isUpdating}
                    >
                      Give Opponent (+3)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onResolveFaceCard('give', '-3')}
                      isLoading={isUpdating}
                    >
                      Give Opponent (-3)
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={onDraw}
              isLoading={isUpdating}
            >
              Hit (Draw Card)
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onStand}
              isLoading={isUpdating}
              leftIcon={<Hand className="size-4" />}
            >
              Stand
            </Button>
          </>
        )
      )}

      {!isFinished && (!isMyTurn || myPlayer?.hasStood || myPlayer?.busted) && (
        <p className="text-sm text-slate-400 animate-pulse">
          {myPlayer?.busted
            ? 'You busted — waiting for showdown...'
            : myPlayer?.hasStood
              ? 'You stood — waiting for opponent...'
              : 'Waiting for opponent...'}
        </p>
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
