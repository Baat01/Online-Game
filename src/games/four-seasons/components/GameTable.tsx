import { ThemedCard } from '../../_shared/components'
import type { Suit } from '../../_shared/deck'
import {
  SEASON_META,
  SEASON_ORDER,
  type FourSeasonsPlayer,
  type FourSeasonsState,
} from '../engine/fourSeasonsEngine'
import { PlayerArea } from './PlayerArea'

interface GameTableProps {
  gameState: FourSeasonsState
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string }>
  pendingKingCardId: string | null
  onPlayCard: (cardId: string) => void
  onDrawCard: () => void
}

export function GameTable({
  gameState,
  currentUserId,
  playerProfiles,
  pendingKingCardId,
  onPlayCard,
  onDrawCard,
}: GameTableProps) {
  const players = Object.values(gameState.playersRecord) as FourSeasonsPlayer[]
  const opponent = players.find((p) => p.userId !== currentUserId)
  const me = players.find((p) => p.userId === currentUserId)

  const activeMeta = SEASON_META[gameState.activeSeason]
  const nextSuit: Suit = SEASON_ORDER[gameState.activeSeason]
  const nextMeta = SEASON_META[nextSuit]
  const topDiscard =
    gameState.discardPile.length > 0
      ? gameState.discardPile[gameState.discardPile.length - 1]
      : null
  const isMyTurn = Boolean(currentUserId && gameState.currentTurnUserId === currentUserId)

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 gap-5 max-w-5xl mx-auto w-full">
      {/* Opponent Area */}
      {opponent && (
        <PlayerArea
          player={opponent}
          displayName={playerProfiles[opponent.userId]?.displayName ?? 'Opponent'}
          isMe={false}
          isCurrentTurn={gameState.currentTurnUserId === opponent.userId}
          activeSeason={gameState.activeSeason}
          hasPendingKing={false}
          onPlayCard={() => {}}
        />
      )}

      {/* Center Table */}
      <div className="flex flex-col items-center gap-4 my-auto">
        <div className="text-center space-y-1">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${activeMeta.badgeClass}`}
          >
            <span>{activeMeta.emoji}</span>
            <span>Active Season: {activeMeta.name}</span>
          </div>
          <p className="text-xs text-slate-400">
            Play <strong>{activeMeta.name}</strong> ({activeMeta.emoji}),{' '}
            <strong>{nextMeta.name}</strong> ({nextMeta.emoji}), or any <strong>King</strong>
          </p>
        </div>

        {gameState.lastEffectText && (
          <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-medium animate-fade-in">
            {gameState.lastEffectText}
          </div>
        )}

        <div className="flex items-center gap-8">
          {/* Draw Deck */}
          <div className="flex flex-col items-center gap-1.5">
            <ThemedCard
              isHidden
              size="lg"
              playable={isMyTurn && !pendingKingCardId && gameState.status !== 'finished'}
              disabled={!isMyTurn || Boolean(pendingKingCardId) || gameState.status === 'finished'}
              onClick={onDrawCard}
              ariaLabel="Draw 1 card from deck"
            />
            <span className="text-xs font-medium text-slate-400">
              Deck ({gameState.deck.length})
            </span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-1.5">
            {topDiscard ? (
              <ThemedCard
                suit={topDiscard.suit}
                rank={topDiscard.rank}
                size="lg"
                seasonLabel={SEASON_META[topDiscard.suit].name}
              />
            ) : (
              <div className="w-24 h-36 rounded-xl border-2 border-dashed border-slate-700" />
            )}
            <span className="text-xs font-medium text-slate-400">Discard Pile</span>
          </div>
        </div>

        {gameState.status === 'finished' && (
          <div className="rounded-2xl border border-emerald-400/60 bg-emerald-950/50 px-8 py-5 text-center animate-slide-up">
            <h2 className="text-3xl font-extrabold text-emerald-300">
              {gameState.winnerId === currentUserId
                ? 'Victory! Your hand is empty!'
                : `${playerProfiles[gameState.winnerId ?? '']?.displayName ?? 'Opponent'} Won!`}
            </h2>
          </div>
        )}
      </div>

      {/* My Area */}
      {me && (
        <PlayerArea
          player={me}
          displayName={playerProfiles[me.userId]?.displayName ?? 'You'}
          isMe
          isCurrentTurn={isMyTurn}
          activeSeason={gameState.activeSeason}
          hasPendingKing={Boolean(pendingKingCardId)}
          onPlayCard={onPlayCard}
        />
      )}
    </div>
  )
}
