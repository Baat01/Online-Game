import { Coins } from 'lucide-react'
import { ThemedCard } from '../../_shared/components'
import type { PlayerCardThemeSelection } from '../../_shared/useGenericGame'
import type { Suit } from '../../_shared/deck'
import { formatYen } from '@/services/wallet/walletService'
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
  playerThemes?: Record<string, PlayerCardThemeSelection>
  potYen?: number
  pendingKingCardId: string | null
  onPlayCard: (cardId: string) => void
  onDrawCard: () => void
}

export function GameTable({
  gameState,
  currentUserId,
  playerProfiles,
  playerThemes = {},
  potYen = 0,
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
  const myTheme = currentUserId ? playerThemes[currentUserId] : undefined
  const discardOwnerTheme = topDiscard?.ownerId ? playerThemes[topDiscard.ownerId] : undefined

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 gap-5 max-w-5xl mx-auto w-full bg-engei-pattern">
      {/* Opponent Area */}
      {opponent && (
        <PlayerArea
          player={opponent}
          displayName={playerProfiles[opponent.userId]?.displayName ?? 'Opponent'}
          isMe={false}
          isCurrentTurn={gameState.currentTurnUserId === opponent.userId}
          activeSeason={gameState.activeSeason}
          hasPendingKing={false}
          playerTheme={playerThemes[opponent.userId]}
          onPlayCard={() => {}}
        />
      )}

      {/* Center Table */}
      <div className="flex flex-col items-center gap-4 my-auto">
        <div className="text-center space-y-1.5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${activeMeta.badgeClass}`}
            >
              <span>{activeMeta.emoji}</span>
              <span>Active Season: {activeMeta.name}</span>
            </div>
            {potYen > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/35 text-gold-300 font-mono text-xs font-semibold">
                <Coins className="size-3.5" aria-hidden="true" />
                Pot : {formatYen(potYen)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Play <strong>{activeMeta.name}</strong> ({activeMeta.emoji}),{' '}
            <strong>{nextMeta.name}</strong> ({nextMeta.emoji}), or any <strong>King</strong>
          </p>
        </div>

        {gameState.lastEffectText && (
          <div className="px-3 py-1 rounded-full bg-gold-500/15 border border-gold-400/40 text-gold-200 text-xs font-medium animate-fade-in">
            {gameState.lastEffectText}
          </div>
        )}

        <div className="flex items-center gap-8">
          {/* Draw Deck */}
          <div className="flex flex-col items-center gap-1.5">
            <ThemedCard
              isHidden
              size="lg"
              frontThemeId={myTheme?.frontThemeId}
              backThemeId={myTheme?.backThemeId}
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
                frontThemeId={discardOwnerTheme?.frontThemeId}
                backThemeId={discardOwnerTheme?.backThemeId}
                seasonLabel={SEASON_META[topDiscard.suit].name}
              />
            ) : (
              <div className="w-24 h-36 rounded-xl border-2 border-dashed border-slate-700" />
            )}
            <span className="text-xs font-medium text-slate-400">Discard Pile</span>
          </div>
        </div>

        {gameState.status === 'finished' && (
          <div className="rounded-2xl border border-gold-400/60 bg-amber-950/40 px-8 py-5 text-center animate-slide-up space-y-1">
            <h2 className="text-3xl font-extrabold text-gold-300">
              {gameState.winnerId === currentUserId
                ? 'Victory! Your hand is empty!'
                : `${playerProfiles[gameState.winnerId ?? '']?.displayName ?? 'Opponent'} Won!`}
            </h2>
            {potYen > 0 && (
              <p className="text-sm font-mono text-gold-200">
                Pot remporté : +{formatYen(potYen)}
              </p>
            )}
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
          playerTheme={playerThemes[me.userId]}
          onPlayCard={onPlayCard}
        />
      )}
    </div>
  )
}
