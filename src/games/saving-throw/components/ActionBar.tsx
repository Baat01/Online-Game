import { Dices, Check, RefreshCw, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SavingThrowPlayer, SavingThrowState } from '../engine/savingThrowEngine'

interface ActionBarProps {
  gameState: SavingThrowState
  myPlayer: SavingThrowPlayer | null
  isMyTurn: boolean
  isHost: boolean
  isUpdating: boolean
  currentUserId?: string
  onCoinFlip: (choice: 'heads' | 'tails') => void
  onTiebreakFlip: (choice: 'heads' | 'tails') => void
  onRoll: () => void
  onReroll: () => void
  onKeep: () => void
  onNextRound: () => void
  onRematch: () => void
  onBackToLobby: () => void
}

export function ActionBar({
  gameState,
  myPlayer,
  isMyTurn,
  isHost,
  isUpdating,
  currentUserId,
  onCoinFlip,
  onTiebreakFlip,
  onRoll,
  onReroll,
  onKeep,
  onNextRound,
  onRematch,
  onBackToLobby,
}: ActionBarProps) {
  const isChallenger = gameState.challengerId === currentUserId

  return (
    <div className="px-4 py-4 bg-surface-900/90 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
      {/* Opening Coin Flip */}
      {gameState.status === 'waiting' && (
        isChallenger ? (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => onCoinFlip('heads')}
              isLoading={isUpdating}
            >
              Call Heads
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onCoinFlip('tails')}
              isLoading={isUpdating}
            >
              Call Tails
            </Button>
          </>
        ) : (
          <p className="text-sm text-slate-400 animate-pulse">
            Waiting for challenger to flip the starting coin...
          </p>
        )
      )}

      {/* Tiebreaker Coin Flip */}
      {gameState.tiebreakerActive && (
        isChallenger ? (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => onTiebreakFlip('heads')}
              isLoading={isUpdating}
            >
              Tiebreaker: Heads
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onTiebreakFlip('tails')}
              isLoading={isUpdating}
            >
              Tiebreaker: Tails
            </Button>
          </>
        ) : (
          <p className="text-sm text-amber-300 animate-pulse">
            Waiting for challenger to decide the tiebreaker coin flip...
          </p>
        )
      )}

      {/* Active Turn */}
      {gameState.status === 'player_turns' && !gameState.tiebreakerActive && (
        isMyTurn && myPlayer && myPlayer.finalScore === null ? (
          !myPlayer.hasRolled ? (
            <Button
              variant="primary"
              size="lg"
              onClick={onRoll}
              isLoading={isUpdating}
              leftIcon={<Dices className="size-4" />}
            >
              Roll 2d10
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={onKeep}
                isLoading={isUpdating}
                leftIcon={<Check className="size-4" />}
              >
                Keep Score ({myPlayer.score})
              </Button>
              {!myPlayer.hasRerolled && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onReroll}
                  isLoading={isUpdating}
                  leftIcon={<RefreshCw className="size-4" />}
                >
                  Reroll Both Dice (1 Left)
                </Button>
              )}
            </>
          )
        ) : (
          <p className="text-sm text-slate-400 animate-pulse">
            Waiting for opponent&apos;s roll...
          </p>
        )
      )}

      {/* Round Result */}
      {gameState.status === 'result' && !gameState.tiebreakerActive && (
        isHost ? (
          <Button
            variant="primary"
            size="lg"
            onClick={onNextRound}
            isLoading={isUpdating}
            rightIcon={<ArrowRight className="size-4" />}
          >
            Start Round {gameState.roundNumber + 1} (Swap Roles)
          </Button>
        ) : (
          <p className="text-sm text-slate-400">Waiting for host to advance to the next round...</p>
        )
      )}

      {/* Finished */}
      {gameState.status === 'finished' && (
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
