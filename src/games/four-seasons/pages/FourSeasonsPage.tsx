import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGenericGame } from '../../_shared/useGenericGame'
import { playCard, drawCard, canPlayCard } from '../engine/fourSeasonsEngine'
import type { FourSeasonsState } from '../engine/fourSeasonsEngine'
import type { Card, Suit } from '../../_shared/deck'
import { Button } from '@/components/ui/Button'

const SEASON_EMOJIS: Record<Suit, string> = {
  'hearts': '🌸 Spring',
  'diamonds': '☀️ Summer',
  'spades': '🍂 Autumn',
  'clubs': '❄️ Winter'
}

export function FourSeasonsPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { gameState, updateGameState, emitEvent, isUpdating } = useGenericGame<FourSeasonsState>(roomId ?? '')

  const [pendingKing, setPendingKing] = useState<string | null>(null)

  if (!roomId) {
    navigate('/games', { replace: true })
    return null
  }



  if (!gameState || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-white/50 mb-4">Waiting for game data...</p>
      </div>
    )
  }

  const myPlayer = gameState.playersRecord[user.id]
  const isMyTurn = gameState.currentTurnUserId === user.id

  const handlePlayCard = async (cardId: string, newSeasonChoice?: Suit) => {
    if (!isMyTurn || !myPlayer) return

    const card = myPlayer.hand.find(c => c.id === cardId)
    if (!card) return

    if (!canPlayCard(card, gameState.activeSeason, myPlayer.hand.length === 1)) {
      return // invalid move
    }

    if (card.rank === 'K' && !newSeasonChoice) {
      setPendingKing(card.id)
      return
    }

    const newState = playCard(gameState, user.id, cardId, newSeasonChoice)
    setPendingKing(null)
    
    await updateGameState(newState)
    emitEvent({ type: 'play_card', payload: { userId: user.id, cardId } })
  }

  const handleDraw = async () => {
    if (!isMyTurn || !myPlayer) return
    const newState = drawCard(gameState, user.id)
    await updateGameState(newState)
    emitEvent({ type: 'draw_card', payload: { userId: user.id } })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-green-900 via-emerald-950 to-black text-white p-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-emerald-400">Four Seasons</h1>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/room/${roomId}`)}>Back to Lobby</Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between space-y-8">
        
        {/* Opponent Area */}
        <div className="w-full max-w-3xl flex justify-center flex-wrap gap-4">
           {Object.values(gameState.playersRecord).filter(p => p.userId !== user.id).map(p => (
            <div key={p.userId} className="p-4 rounded border border-slate-800 bg-slate-900">
              <p className="text-sm text-slate-400 mb-2">Opponent</p>
              <div className="flex gap-1">
                {p.hand.map((_, i) => (
                  <div key={i} className="w-8 h-12 bg-slate-800 border border-slate-600 rounded" />
                ))}
              </div>
            </div>
           ))}
        </div>

        {/* Center Table */}
        <div className="flex flex-col items-center">
           <div className="mb-4 text-center">
             <p className="text-emerald-300 font-semibold tracking-widest uppercase">Active Season</p>
             <p className="text-3xl mt-2">{SEASON_EMOJIS[gameState.activeSeason]}</p>
           </div>
           
           <div className="flex gap-8 items-center mt-8">
              <div 
                onClick={handleDraw}
                className={`w-24 h-32 bg-slate-800 border-2 rounded-xl flex items-center justify-center cursor-pointer ${isMyTurn ? 'border-emerald-500' : 'border-slate-600 opacity-50'}`}
              >
                Deck ({gameState.deck.length})
              </div>

              <div className="w-24 h-32 bg-white text-black border-2 border-slate-300 rounded-xl flex items-center justify-center font-bold text-3xl">
                {gameState.discardPile.length > 0 && gameState.discardPile[gameState.discardPile.length - 1].rank}
              </div>
           </div>

           {pendingKing && (
             <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-emerald-500">
               <p className="mb-4 text-center">Choose the next season:</p>
               <div className="flex gap-4">
                 {(Object.keys(SEASON_EMOJIS) as Suit[]).map(s => (
                   <Button key={s} variant="secondary" onClick={() => handlePlayCard(pendingKing, s)} isLoading={isUpdating}>
                     {SEASON_EMOJIS[s]}
                   </Button>
                 ))}
               </div>
             </div>
           )}
        </div>

        {/* Player Area */}
        <div className="w-full max-w-4xl p-6 rounded-2xl border bg-slate-900/50 backdrop-blur-sm border-slate-800">
          <div className="flex justify-center gap-2 mt-4 min-h-[140px]">
            {myPlayer?.hand.map((c: Card) => {
              const playable = isMyTurn && !pendingKing && canPlayCard(c, gameState.activeSeason, myPlayer.hand.length === 1);
              return (
                <div 
                  key={c.id} 
                  onClick={() => playable && handlePlayCard(c.id)}
                  className={`w-20 h-28 bg-white text-black rounded-xl shadow flex flex-col items-center justify-center font-bold text-xl ${playable ? 'cursor-pointer hover:-translate-y-4' : 'opacity-50 grayscale'}`}
                >
                  <div className="flex flex-col items-center">
                    <span>{c.rank}</span>
                    <span className="text-sm">{c.suit === 'hearts' || c.suit === 'diamonds' ? '❤️' : '♠️'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Result Overlay */}
        {gameState.status === 'finished' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
             <div className="text-center p-12 bg-slate-900 rounded-3xl border-2 border-emerald-500 animate-slide-up">
                <h2 className="text-5xl font-bold text-emerald-400 mb-6">
                  {gameState.winnerId === user?.id ? 'You Won!' : 'Opponent Won!'}
                </h2>
                <Button variant="primary" size="lg" onClick={() => navigate(`/room/${roomId}`)}>Back to Room</Button>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
