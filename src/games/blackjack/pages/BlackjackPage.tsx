import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useLobby'
import { useBlackjack } from '../hooks/useBlackjack'
import { useBlackjackRealtime } from '../realtime/blackjackRealtime'
import { supabase } from '@/lib/supabase'

import { BlackjackTable } from '../components/BlackjackTable'
import { ActionBar } from '../components/ActionBar'
import { RoundResult } from '../components/RoundResult'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

export function BlackjackPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: room, isLoading: roomLoading } = useRoom(roomId ?? '')
  
  const {
    game,
    players,
    myPlayer,
    myTurn,
    loading: gameLoading,
    createGame,
    start,
    hit,
    stand,
    reset,
    isPending
  } = useBlackjack(roomId ?? '')

  useBlackjackRealtime(roomId ?? '', game?.id)

  const [profileMap, setProfileMap] = useState<Record<string, { username: string; avatarUrl: string | null }>>({})
  const [initializing, setInitializing] = useState(false)

  const isHost = user?.id === room?.hostId

  // Fetch profiles for players
  useEffect(() => {
    async function fetchProfiles() {
      if (!room) return
      const ids = room.players.map(p => p.userId)
      if (!ids.length) return
      
      const { data } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids)
      if (data) {
        const map: Record<string, { username: string; avatarUrl: string | null }> = {}
        data.forEach(p => {
          map[p.id] = { username: p.username, avatarUrl: p.avatar_url }
        })
        setProfileMap(map)
      }
    }
    fetchProfiles()
  }, [room])

  // Initialize game on mount if host and game doesn't exist
  useEffect(() => {
    if (!roomId || !room || gameLoading) return
    
    if (!game && isHost && !initializing) {
      setInitializing(true)
      const userIds = room.players.map(p => p.userId)
      createGame(userIds).catch(console.error).finally(() => setInitializing(false))
    }
  }, [roomId, room, game, isHost, gameLoading, createGame, initializing])


  if (!roomId) {
    navigate('/games', { replace: true })
    return null
  }

  if (roomLoading || gameLoading || initializing) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-white/50 mb-4">Waiting for host to initialize the game...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-b from-green-900 to-green-950 overflow-hidden">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10">
        <h1 className="text-lg font-bold text-white/90">Blackjack</h1>
        <div className="flex gap-2">
          {isHost && game.status === 'waiting' && (
            <Button size="sm" variant="primary" onClick={() => start()} isLoading={isPending}>
              Start Game
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => navigate(`/room/${roomId}`)}>
            Back to Lobby
          </Button>
        </div>
      </div>

      {/* Game Table Area */}
      <div className="flex-1 flex flex-col relative">
        <BlackjackTable
          game={game}
          players={players}
          myUserId={user?.id}
          profileMap={profileMap}
        />

        {/* Action Bar (Overlays table at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6">
          <ActionBar
            game={game}
            player={myPlayer}
            isMyTurn={myTurn}
            onHit={() => hit()}
            onStand={() => stand()}
            isPending={isPending}
          />
          <RoundResult
            game={game}
            player={myPlayer}
            isHost={isHost}
            onReset={() => reset()}
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  )
}
