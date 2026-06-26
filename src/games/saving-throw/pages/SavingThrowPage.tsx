import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useLobby'
import { useGenericGame } from '../_shared/useGenericGame'
import { SavingThrowState, rollTwoD10, combineDice, resolveRound, checkWinner, nextRole, handleTiebreak } from './engine/savingThrowEngine'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

export function SavingThrowPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { data: room, isLoading: roomLoading } = useRoom(roomId ?? '')
  const { gameState, isHost, updateGameState, emitEvent, isUpdating } = useGenericGame<SavingThrowState>(roomId ?? '')

  if (!roomId) {
    navigate('/games', { replace: true })
    return null
  }

  if (roomLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-white/50 mb-4">Waiting for host to initialize the game...</p>
      </div>
    )
  }

  const myPlayer = user ? gameState.playersRecord[user.id] : null
  const isMyTurn = gameState.currentTurnUserId === user?.id

  const handleStartCoinFlip = async (choice: 'heads' | 'tails') => {
    if (gameState.challengerId !== user?.id) return
    const result = Math.random() < 0.5 ? 'heads' : 'tails'
    
    // The winner of the coin flip becomes 'first'
    const otherPlayerId = Object.keys(gameState.playersRecord).find(id => id !== user.id)!
    const firstId = choice === result ? user.id : otherPlayerId
    const secondId = choice === result ? otherPlayerId : user.id

    const newPlayersRecord = {
      ...gameState.playersRecord,
      [firstId]: { ...gameState.playersRecord[firstId], role: 'first' as const },
      [secondId]: { ...gameState.playersRecord[secondId], role: 'second' as const }
    }

    await updateGameState({
      coinChoice: choice,
      coinResult: result,
      status: 'player_turns',
      currentTurnUserId: firstId,
      playersRecord: newPlayersRecord
    })
    
    emitEvent({ type: 'game_started', payload: { firstId } })
  }

  const handleRoll = async () => {
    if (!isMyTurn || !myPlayer) return
    const [tens, units] = rollTwoD10()
    const score = combineDice(tens, units)

    const updatedPlayer = {
      ...myPlayer,
      hasRolled: true,
      score,
      finalScore: score // by default, if they don't reroll, this is their final score
    }

    // If second player, they only roll once in this basic version, or can they reroll too?
    // "they can keep result OR reroll BOTH dice once" - applies to both players?
    // "First player rolls 2d10... Second player must beat..." Usually both have the choice, but let's assume both can reroll.

    let newState = {
      ...gameState,
      playersRecord: {
        ...gameState.playersRecord,
        [user.id]: updatedPlayer
      }
    }
    await updateGameState(newState)
    emitEvent({ type: 'dice_rolled', payload: { userId: user.id, score, isReroll: false } })
  }

  const handleReroll = async () => {
    if (!isMyTurn || !myPlayer) return
    const [tens, units] = rollTwoD10()
    const score = combineDice(tens, units)

    const updatedPlayer = {
      ...myPlayer,
      hasRerolled: true,
      score,
      finalScore: score
    }

    let newState = {
      ...gameState,
      playersRecord: {
        ...gameState.playersRecord,
        [user.id]: updatedPlayer
      }
    }
    await updateGameState(newState)
    emitEvent({ type: 'dice_rolled', payload: { userId: user.id, score, isReroll: true } })
  }

  const handleKeep = async () => {
    if (!isMyTurn || !myPlayer) return
    
    // Proceed to next turn or resolve round
    let newState = {
      ...gameState,
      playersRecord: {
        ...gameState.playersRecord,
        [user.id]: {
          ...myPlayer,
          finalScore: myPlayer.score // lock it in
        }
      }
    }

    // If it's the first player, pass turn to second.
    if (myPlayer.role === 'first') {
      const second = Object.values(newState.playersRecord).find(p => p.role === 'second')!
      newState.currentTurnUserId = second.userId
      await updateGameState(newState)
      emitEvent({ type: 'turn_changed', payload: { currentTurnUserId: second.userId } })
    } else {
      // It's the second player, resolve round!
      newState = resolveRound(newState)
      newState = checkWinner(newState)
      await updateGameState(newState)
      emitEvent({ type: 'state_updated', payload: { status: newState.status } })
    }
  }

  const handleNextRound = async () => {
    if (!isHost) return
    let newState = nextRole(gameState)
    await updateGameState(newState)
    emitEvent({ type: 'turn_changed', payload: { currentTurnUserId: newState.currentTurnUserId } })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900 to-black text-white p-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-indigo-400">Saving Throw</h1>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/room/${roomId}`)}>Back to Lobby</Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Waiting for coin flip */}
        {gameState.status === 'waiting' && (
          <div className="text-center space-y-4">
            <h2 className="text-xl">Challenger Coin Flip</h2>
            {gameState.challengerId === user?.id ? (
              <div className="flex gap-4 justify-center">
                <Button onClick={() => handleStartCoinFlip('heads')} isLoading={isUpdating}>Heads</Button>
                <Button onClick={() => handleStartCoinFlip('tails')} isLoading={isUpdating}>Tails</Button>
              </div>
            ) : (
              <p className="text-slate-400">Waiting for challenger to flip coin...</p>
            )}
          </div>
        )}

        {/* Player Turns */}
        {gameState.status === 'player_turns' && (
          <div className="text-center space-y-4">
            <h2 className="text-xl">Round {gameState.roundNumber}</h2>
            <div className="flex justify-between w-full max-w-lg gap-8 text-lg">
              {Object.values(gameState.playersRecord).map(p => (
                <div key={p.userId} className={`p-4 rounded-lg border ${gameState.currentTurnUserId === p.userId ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900'}`}>
                  <p className="font-semibold">{p.userId === user?.id ? 'You' : 'Opponent'} ({p.role})</p>
                  <p>Wins: {p.wins}/3</p>
                  <p className="text-2xl font-mono my-2">{p.score > 0 ? p.score : '--'}</p>
                  {p.hasRerolled && <p className="text-xs text-slate-400">Rerolled</p>}
                </div>
              ))}
            </div>

            {isMyTurn && myPlayer && !myPlayer.finalScore && (
              <div className="flex gap-4 justify-center mt-8">
                {!myPlayer.hasRolled ? (
                  <Button variant="primary" onClick={handleRoll} isLoading={isUpdating}>Roll 2d10</Button>
                ) : (
                  <>
                    <Button variant="primary" onClick={handleKeep} isLoading={isUpdating}>Keep Score</Button>
                    {!myPlayer.hasRerolled && (
                      <Button variant="secondary" onClick={handleReroll} isLoading={isUpdating}>Reroll</Button>
                    )}
                  </>
                )}
              </div>
            )}
            
            {!isMyTurn && <p className="text-slate-400 animate-pulse mt-8">Waiting for opponent...</p>}
          </div>
        )}

        {/* Round Result */}
        {gameState.status === 'result' && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gold-400">
              {gameState.roundWinnerId === user?.id ? 'You won the round!' : 'Opponent won the round!'}
            </h2>
            <div className="flex justify-center gap-8 my-4">
               {Object.values(gameState.playersRecord).map(p => (
                <div key={p.userId}>
                  <p>{p.role}</p>
                  <p className="font-mono text-xl">{p.finalScore}</p>
                </div>
              ))}
            </div>
            {isHost && (
              <Button variant="primary" onClick={handleNextRound} isLoading={isUpdating}>Next Round</Button>
            )}
          </div>
        )}

        {/* Finished */}
        {gameState.status === 'finished' && (
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-green-400">
              {gameState.gameWinnerId === user?.id ? 'Victory!' : 'Defeat!'}
            </h2>
          </div>
        )}
      </div>
    </div>
  )
}
