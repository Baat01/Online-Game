import { useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGenericGame } from '../../_shared/useGenericGame'
import {
  createInitialState,
  startMatchCoinFlip,
  applyPlayerRoll,
  lockPlayerScore,
  nextRole,
  handleTiebreak,
  type SavingThrowState,
} from '../engine/savingThrowEngine'
import { GameStatus } from '../components/GameStatus'
import { GameTable } from '../components/GameTable'
import { ActionBar } from '../components/ActionBar'

export function SavingThrowPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const createInitial = useCallback(
    (players: string[], hostId: string) => createInitialState(players, hostId),
    [],
  )

  const {
    gameState,
    isHost,
    playerProfiles,
    roomPotYen,
    updateGameState,
    emitEvent,
    isUpdating,
    resetMatch,
  } = useGenericGame<SavingThrowState>(roomId ?? '', {
    gameSlug: 'saving-throw',
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
        <p className="text-slate-400 animate-pulse">Waiting for host to initialize Saving Throw...</p>
      </div>
    )
  }

  const myPlayer = user ? (gameState.playersRecord[user.id] ?? null) : null
  const isMyTurn = Boolean(user && gameState.currentTurnUserId === user.id)

  const handleCoinFlip = async (choice: 'heads' | 'tails') => {
    if (!user || gameState.challengerId !== user.id) return
    const nextState = startMatchCoinFlip(gameState, choice)
    await updateGameState(nextState)
    await emitEvent({
      type: 'turn_changed',
      payload: {
        currentTurnUserId: nextState.currentTurnUserId,
        coinChoice: choice,
        coinResult: nextState.coinResult,
      },
    })
  }

  const handleTiebreakFlip = async (choice: 'heads' | 'tails') => {
    if (!user || gameState.challengerId !== user.id) return
    const nextState = handleTiebreak(gameState, choice)
    await updateGameState({ ...nextState, markRoomFinished: true })
    await emitEvent({
      type: 'game_finished',
      payload: { winnerId: nextState.gameWinnerId, tiebreaker: true },
    })
  }

  const handleRoll = async () => {
    if (!user || !isMyTurn) return
    const nextState = applyPlayerRoll(gameState, user.id, false)
    await updateGameState(nextState)
    await emitEvent({
      type: 'state_updated',
      payload: {
        action: 'roll',
        userId: user.id,
        score: nextState.playersRecord[user.id]?.score,
      },
    })
  }

  const handleReroll = async () => {
    if (!user || !isMyTurn) return
    const nextState = applyPlayerRoll(gameState, user.id, true)
    const finished = nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'turn_changed',
      payload: {
        action: 'reroll',
        userId: user.id,
        score: nextState.playersRecord[user.id]?.score,
        currentTurnUserId: nextState.currentTurnUserId,
        winnerId: nextState.gameWinnerId,
      },
    })
  }

  const handleKeep = async () => {
    if (!user || !isMyTurn) return
    const nextState = lockPlayerScore(gameState, user.id)
    const finished = nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'turn_changed',
      payload: {
        action: 'keep',
        userId: user.id,
        finalScore: nextState.playersRecord[user.id]?.finalScore,
        currentTurnUserId: nextState.currentTurnUserId,
        winnerId: nextState.gameWinnerId,
      },
    })
  }

  const handleNextRound = async () => {
    if (!isHost) return
    const nextState = nextRole(gameState)
    await updateGameState(nextState)
    await emitEvent({
      type: 'turn_changed',
      payload: { roundNumber: nextState.roundNumber, currentTurnUserId: nextState.currentTurnUserId },
    })
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900 via-indigo-950/30 to-black text-white">
      <GameStatus
        gameState={gameState}
        currentUserId={user?.id}
        playerProfiles={playerProfiles}
        potYen={roomPotYen}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />

      <GameTable
        gameState={gameState}
        currentUserId={user?.id}
        playerProfiles={playerProfiles}
        potYen={roomPotYen}
      />

      <ActionBar
        gameState={gameState}
        myPlayer={myPlayer}
        isMyTurn={isMyTurn}
        isHost={isHost}
        isUpdating={isUpdating}
        currentUserId={user?.id}
        onCoinFlip={handleCoinFlip}
        onTiebreakFlip={handleTiebreakFlip}
        onRoll={handleRoll}
        onReroll={handleReroll}
        onKeep={handleKeep}
        onNextRound={handleNextRound}
        onRematch={() => void resetMatch()}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />
    </div>
  )
}
