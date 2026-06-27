import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGenericGame } from '../../_shared/useGenericGame'
import type { TwistState } from '../engine/twistEngine'
import { applyCardEffect, resolveGame, validateMove, calculateScore } from '../engine/twistEngine'
import { drawCards } from '../../_shared/deck'
import { getNextTurn } from '../../_shared/turns'
import { Button } from '@/components/ui/Button'

export function BlackjackTwistPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { gameState, updateGameState, emitEvent, isUpdating } = useGenericGame<TwistState>(roomId ?? '')

  const [pendingCardAction, setPendingCardAction] = useState<any>(null) // Used when drawing a face card

  if (!roomId) {
    navigate('/games', { replace: true })
    return null
  }

  if (!roomId) {
    navigate('/games', { replace: true })
    return null
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

  const checkAutoStandOrBust = (state: TwistState) => {
    const players = Object.values(state.playersRecord)
    if (players.every(p => p.hasStood || p.busted)) {
      return resolveGame(state)
    }
    return state
  }

  const handleDraw = async () => {
    if (!isMyTurn || !myPlayer || pendingCardAction || !user) return
    if (!validateMove(gameState, user.id)) return

    const deck = drawCards(gameState.deck as any, 1)
    const card = deck.drawn[0]

    if (['J', 'Q', 'K'].includes(card.rank)) {
      setPendingCardAction(card)
    } else {
      // Normal draw
      let targetPlayer = applyCardEffect(card, 'take', myPlayer)
      targetPlayer.score = calculateScore(targetPlayer.hand, gameState.sharedHiddenCard, gameState.sharedRevealed)
      if (targetPlayer.score > 21) targetPlayer.busted = true
      
      let newState: TwistState = {
        ...gameState,
        deck: deck.remaining,
        playersRecord: { ...gameState.playersRecord, [user.id]: targetPlayer }
      }

      if (targetPlayer.busted) {
        newState.currentTurnUserId = getNextTurn(Object.keys(gameState.playersRecord), user.id)
      }

      newState = checkAutoStandOrBust(newState)
      await updateGameState(newState)
      emitEvent({ type: 'draw_card', payload: { userId: user.id } })
    }
  }

  const handleApplyFaceCard = async (action: 'take' | 'give', kingChoice?: '+3' | '-3') => {
    if (!pendingCardAction || !myPlayer) return

    const card = pendingCardAction
    setPendingCardAction(null)

    // Remove card from deck
    drawCards(gameState.deck as any, 1) // wait, the card is already popped conceptually, but we didn't save it!
    // we need to slice it
    const newDeck = gameState.deck.slice(1)

    let newState = { ...gameState, deck: newDeck }

    if (action === 'give') {
      const opponentId = Object.keys(gameState.playersRecord).find(id => id !== user!.id)!
      let oppPlayer = gameState.playersRecord[opponentId]
      
      oppPlayer = applyCardEffect(card, 'give', oppPlayer, kingChoice)
      oppPlayer.score = calculateScore(oppPlayer.hand, gameState.sharedHiddenCard, gameState.sharedRevealed)
      if (oppPlayer.score > 21) oppPlayer.busted = true

      newState.playersRecord[opponentId] = oppPlayer
    } else {
      let targetPlayer = applyCardEffect(card, 'take', myPlayer)
      targetPlayer.score = calculateScore(targetPlayer.hand, gameState.sharedHiddenCard, gameState.sharedRevealed)
      if (targetPlayer.score > 21) targetPlayer.busted = true

      newState.playersRecord[user!.id] = targetPlayer
      if (targetPlayer.busted) {
        newState.currentTurnUserId = getNextTurn(Object.keys(gameState.playersRecord), user!.id)
      }
    }

    newState = checkAutoStandOrBust(newState)
    await updateGameState(newState)
    emitEvent({ type: 'play_face_card', payload: { userId: user!.id, action } })
  }

  const handleStand = async () => {
    if (!isMyTurn || !myPlayer || pendingCardAction || !user) return
    
    let newState: TwistState = {
      ...gameState,
      playersRecord: {
        ...gameState.playersRecord,
        [user.id]: { ...myPlayer, hasStood: true }
      }
    }

    newState.currentTurnUserId = getNextTurn(Object.keys(gameState.playersRecord), user.id)
    newState = checkAutoStandOrBust(newState)

    await updateGameState(newState)
    emitEvent({ type: 'stand', payload: { userId: user.id } })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-900 to-black text-white p-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-pink-400">Blackjack Twist</h1>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/room/${roomId}`)}>Back to Lobby</Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        
        {/* Shared Card */}
        <div className="text-center">
          <p className="mb-2 text-slate-300">Shared Card</p>
          <div className={`w-24 h-32 border-2 rounded-xl flex items-center justify-center text-3xl font-bold ${gameState.sharedRevealed ? 'bg-white text-black border-slate-300' : 'bg-slate-800 border-slate-600'}`}>
            {gameState.sharedRevealed ? `${gameState.sharedHiddenCard?.rank}` : '?'}
          </div>
        </div>

        {/* Players Area */}
        <div className="flex justify-between w-full max-w-4xl gap-8">
          {(Object.values(gameState.playersRecord) as any[]).map((p: any) => {
            if (p.userId === user?.id) return (
              <div key={p.userId} className="flex-1 p-6 rounded-xl border bg-slate-900 border-slate-800">
                <h3 className="text-xl mb-4">You {myPlayer?.busted && <span className="text-red-500">(Busted)</span>}</h3>
                <div className="flex gap-2 flex-wrap mb-4">
                  {myPlayer?.hand.map((c: any, i: number) => (
                    <div key={i} className="w-12 h-16 bg-white text-black rounded shadow flex items-center justify-center font-bold relative">
                      {c.rank}
                      {(c as any).currentValue !== undefined && !['J','Q','K','A'].includes(c.rank) === false && (
                        <span className="absolute text-[10px] -mt-8 text-blue-600">{(c as any).currentValue}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xl font-mono">Score: {myPlayer?.score}</p>
                {myPlayer?.hasStood && <p className="text-sm text-green-400 mt-2">Standing</p>}
              </div>
            )
            return (
            <div key={p.userId} className={`flex-1 p-6 rounded-xl border ${gameState.currentTurnUserId === p.userId ? 'border-pink-500 bg-pink-500/10' : 'border-slate-800 bg-slate-900'}`}>
              <h3 className="text-xl mb-4">Opponent {p.busted && <span className="text-red-500">(Busted)</span>}</h3>
              <div className="flex gap-2 flex-wrap mb-4">
                {p.hand.map((c: any, i: number) => (
                  <div key={i} className="w-12 h-16 bg-white text-black rounded shadow flex items-center justify-center font-bold relative">
                    {c.rank}
                    {/* Visual cue for special values */}
                    {(c as any).currentValue !== undefined && !['J','Q','K','A'].includes(c.rank) === false && (
                      <span className="absolute text-[10px] -mt-8 text-blue-600">{(c as any).currentValue}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xl font-mono">Score: {p.score}</p>
              {p.hasStood && <p className="text-sm text-green-400 mt-2">Standing</p>}
            </div>
            )
          })}
        </div>

        {/* Action Bar */}
        {gameState.status === 'player_turns' && isMyTurn && !myPlayer?.hasStood && !myPlayer?.busted && (
          <div className="flex gap-4 items-center">
            {pendingCardAction ? (
              <div className="flex flex-col items-center gap-4 bg-slate-800 p-6 rounded-xl border border-pink-500 animate-pulse">
                <p>You drew a {pendingCardAction.rank}!</p>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => handleApplyFaceCard('take')} isLoading={isUpdating}>Keep (+10)</Button>
                  
                  {pendingCardAction.rank === 'J' && (
                    <Button variant="secondary" onClick={() => handleApplyFaceCard('give')} isLoading={isUpdating}>Give to Opponent (-3)</Button>
                  )}
                  {pendingCardAction.rank === 'Q' && (
                    <Button variant="secondary" onClick={() => handleApplyFaceCard('give')} isLoading={isUpdating}>Give to Opponent (+3)</Button>
                  )}
                  {pendingCardAction.rank === 'K' && (
                    <>
                      <Button variant="secondary" onClick={() => handleApplyFaceCard('give', '+3')} isLoading={isUpdating}>Give (+3)</Button>
                      <Button variant="secondary" onClick={() => handleApplyFaceCard('give', '-3')} isLoading={isUpdating}>Give (-3)</Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Button variant="primary" size="lg" onClick={handleDraw} isLoading={isUpdating}>Hit</Button>
                <Button variant="secondary" size="lg" onClick={handleStand} isLoading={isUpdating}>Stand</Button>
              </>
            )}
          </div>
        )}

        {/* Result */}
        {gameState.status === 'result' && (
          <div className="text-center p-8 bg-slate-900 rounded-2xl border border-gold-500 animate-fade-in mt-8">
            <h2 className="text-3xl font-bold text-gold-400 mb-4">
              {gameState.winnerId === 'draw' ? 'Draw!' : gameState.winnerId === user?.id ? 'You Won!' : 'Opponent Won!'}
            </h2>
            <p className="text-slate-300">Shared card was {gameState.sharedHiddenCard?.rank} of {gameState.sharedHiddenCard?.suit}</p>
          </div>
        )}
      </div>
    </div>
  )
}
