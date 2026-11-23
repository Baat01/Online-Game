import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGenericGame } from '../../_shared/useGenericGame'
import {
  dealInitialHands,
  playCard,
  drawCard,
  canPlayCard,
  type FourSeasonsState,
} from '../engine/fourSeasonsEngine'
import type { Suit } from '../../_shared/deck'
import { GameStatus } from '../components/GameStatus'
import { GameTable } from '../components/GameTable'
import { ActionBar } from '../components/ActionBar'

export function FourSeasonsPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const createInitial = useCallback(
    (players: string[], hostId: string) => dealInitialHands(players, hostId),
    [],
  )

  const {
    gameState,
    isHost,
    playerProfiles,
    playerThemes,
    roomPotYen,
    updateGameState,
    emitEvent,
    isUpdating,
    resetMatch,
  } = useGenericGame<FourSeasonsState>(roomId ?? '', {
    gameSlug: 'four-seasons',
    createInitialState: createInitial,
  })

  const [pendingKingCardId, setPendingKingCardId] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      navigate('/games', { replace: true })
    }
  }, [roomId, navigate])

  if (!roomId) return null

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-950 text-white">
        <p className="text-slate-400 animate-pulse">Waiting for host to deal Four Seasons...</p>
      </div>
    )
  }

  const myPlayer = user ? (gameState.playersRecord[user.id] ?? null) : null
  const isMyTurn = Boolean(user && gameState.currentTurnUserId === user.id)

  const handlePlayCard = async (cardId: string, newSeasonChoice?: Suit) => {
    if (!user || !isMyTurn || !myPlayer) return

    const card = myPlayer.hand.find((c) => c.id === cardId)
    if (!card) return
    if (!canPlayCard(card, gameState.activeSeason, myPlayer.hand.length === 1)) return

    if (card.rank === 'K' && !newSeasonChoice) {
      setPendingKingCardId(card.id)
      return
    }

    const nextState = playCard(gameState, user.id, cardId, newSeasonChoice)
    setPendingKingCardId(null)

    const finished = nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'turn_changed',
      payload: {
        action: 'play_card',
        userId: user.id,
        cardId,
        activeSeason: nextState.activeSeason,
        currentTurnUserId: nextState.currentTurnUserId,
        winnerId: nextState.winnerId,
      },
    })
  }

  const handleDraw = async () => {
    if (!user || !isMyTurn || !myPlayer || pendingKingCardId) return
    const nextState = drawCard(gameState, user.id)
    await updateGameState(nextState)
    await emitEvent({
      type: 'turn_changed',
      payload: {
        action: 'draw_card',
        userId: user.id,
        currentTurnUserId: nextState.currentTurnUserId,
      },
    })
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gradient-to-br from-emerald-950 via-slate-950 to-black text-white">
      <GameStatus
        gameState={gameState}
        currentUserId={user?.id}
        playerProfiles={playerProfiles}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />

      <GameTable
        gameState={gameState}
        currentUserId={user?.id}
        playerProfiles={playerProfiles}
        playerThemes={playerThemes}
        potYen={roomPotYen}
        pendingKingCardId={pendingKingCardId}
        onPlayCard={(cardId) => void handlePlayCard(cardId)}
        onDrawCard={() => void handleDraw()}
      />

      <ActionBar
        gameState={gameState}
        isMyTurn={isMyTurn}
        isHost={isHost}
        isUpdating={isUpdating}
        pendingKingCardId={pendingKingCardId}
        onDrawCard={() => void handleDraw()}
        onSelectKingSeason={(season) =>
          pendingKingCardId && void handlePlayCard(pendingKingCardId, season)
        }
        onCancelKing={() => setPendingKingCardId(null)}
        onRematch={() => void resetMatch()}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />
    </div>
  )
}
