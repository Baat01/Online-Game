import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useLobby'
import { useGenericGame } from '../_shared/useGenericGame'
import { FourSeasonsState, playCard, drawCard, canPlayCard } from './engine/fourSeasonsEngine'
import { Suit } from '../_shared/deck'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

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
  
  const { data: room, isLoading: roomLoading } = useRoom(roomId ?? '')
  const { gameState, updateGameState, emitEvent, isUpdating } = useGenericGame<FourSeasonsState>(roomId ?? '')

  const [pendingKing, setPendingKing] = useState<string | null>(null)

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
        <div className="w-full max-w-3xl flex justify-center opacity-70 pointer-events-none">
           {Object.values(gameState.playersRecord).filter(p => p.userId !== user?.id).map(p => (
            <div key={p.userId} className="flex gap-[-20px] scale-75">
              {p.hand.map((_, i) => (
                <div key={i} className="w-16 h-24 bg-slate-800 border border-slate-600 rounded shadow -ml-8 first:ml-0" />
              ))}
            </div>
           ))}
        </div>

        {/* Center Table */}
        <div className="flex flex-col items-center">
           <div className="mb-4 text-center">
             <p className="text-emerald-300 font-semibold tracking-widest uppercase">Active Season</p>
             <p className="text-3xl mt-2 animate-bounce">{SEASON_EMOJIS[gameState.activeSeason]}</p>
           </div>
           
           <div className="flex gap-8 items-center mt-8">
              {/* Deck */}
              <div 
                onClick={handleDraw}
                className={`w-24 h-32 bg-slate-800 border-2 rounded-xl flex items-center justify-center cursor-pointer transition-transform ${isMyTurn ? 'hover:-translate-y-2 border-emerald-500' : 'border-slate-600 opacity-50'}`}
              >
                <div className="text-center text-sm">
                  <p>Deck</p>
                  <p className="text-slate-400">{gameState.deck.length}</p>
                </div>
              </div>

              {/* Discard Pile */}
              <div className="w-24 h-32 bg-white text-black border-2 border-slate-300 rounded-xl flex items-center justify-center font-bold text-3xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {gameState.discardPile.length > 0 && gameState.discardPile[gameState.discardPile.length - 1].rank}
              </div>
           </div>

           {pendingKing && (
             <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-emerald-500 animate-slide-up">
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
        <div className="w-full max-w-4xl p-6 rounded-2xl border bg-slate-900/50 backdrop-blur-sm border-slate-800 relative min-h-[200px]">
          {isMyTurn ? (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 bg-emerald-500 text-black px-4 py-1 rounded-full text-sm font-bold animate-pulse">
              Your Turn
            </div>
          ) : (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 bg-slate-700 text-slate-300 px-4 py-1 rounded-full text-sm font-bold">
              Opponent's Turn
            </div>
          )}

          <div className="flex gap-4 justify-center mt-6 flex-wrap">
            {myPlayer?.hand.map(c => {
              const playable = isMyTurn && !pendingKing && canPlayCard(c, gameState.activeSeason, myPlayer.hand.length === 1);
              return (
                <div 
                  key={c.id} 
                  onClick={() => playable && handlePlayCard(c.id)}
                  className={`w-20 h-28 bg-white text-black rounded-xl shadow flex items-center justify-center font-bold text-xl transition-all ${playable ? 'cursor-pointer hover:-translate-y-4 hover:shadow-emerald-500/50 hover:shadow-lg' : 'opacity-50 grayscale'}`}
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
