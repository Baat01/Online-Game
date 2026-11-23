import { useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGenericGame } from '../../_shared/useGenericGame'
import {
  dealInitial,
  drawTurnCard,
  resolvePendingCardChoice,
  standTurn,
  type TwistState,
} from '../engine/twistEngine'
import { GameStatus } from '../components/GameStatus'
import { GameTable } from '../components/GameTable'
import { ActionBar } from '../components/ActionBar'

export function BlackjackTwistPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const createInitial = useCallback(
    (players: string[], hostId: string) => dealInitial(players, hostId),
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
  } = useGenericGame<TwistState>(roomId ?? '', {
    gameSlug: 'blackjack-twist',
    createInitialState: createInitial,
  })

  useEffect(() => {
    if (!roomId) {
      navigate('/games', { replace: true })
    }
  }, [roomId, navigate])

  if (!roomId) return null

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-950 text-white">
        <p className="text-slate-400 animate-pulse">Waiting for host to deal Blackjack Twist...</p>
      </div>
    )
  }

  const myPlayer = user ? (gameState.playersRecord[user.id] ?? null) : null
  const isMyTurn = Boolean(user && gameState.currentTurnUserId === user.id)

  const persistTransition = async (nextState: TwistState, actionLabel: string) => {
    const finished = nextState.status === 'result' || nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'turn_changed',
      payload: {
        action: actionLabel,
        userId: user?.id ?? null,
        currentTurnUserId: nextState.currentTurnUserId,
        winnerId: nextState.winnerId,
      },
    })
  }

  const handleDraw = async () => {
    if (!user || !isMyTurn) return
    const nextState = drawTurnCard(gameState, user.id)
    await persistTransition(nextState, nextState.pendingCard ? 'draw_face_pending' : 'draw')
  }

  const handleResolveFaceCard = async (action: 'take' | 'give', kingChoice?: '+3' | '-3') => {
    if (!user || !isMyTurn) return
    const nextState = resolvePendingCardChoice(gameState, user.id, action, kingChoice)
    await persistTransition(nextState, `face_${action}`)
  }

  const handleStand = async () => {
    if (!user || !isMyTurn) return
    const nextState = standTurn(gameState, user.id)
    await persistTransition(nextState, 'stand')
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-950 via-slate-950 to-black text-white">
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
      />

      <ActionBar
        gameState={gameState}
        myPlayer={myPlayer}
        isMyTurn={isMyTurn}
        isHost={isHost}
        isUpdating={isUpdating}
        onDraw={handleDraw}
        onStand={handleStand}
        onResolveFaceCard={handleResolveFaceCard}
        onRematch={() => void resetMatch()}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />
    </div>
  )
}
