import { useEffect, useState, useCallback } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRoom, lobbyKeys } from '@/hooks/useLobby'
import { useAuth } from '@/hooks/useAuth'
import { generateChecksum } from '@/platform/sync/syncEngine'

export function useGenericGame<T>(roomId: string) {
  const queryClient = useQueryClient()
  const { data: roomRaw, isLoading } = useRoom(roomId)
  const room = roomRaw as any
  const { user } = useAuth()
  const [gameState, setGameState] = useState<T | null>((room?.metadata as T) || null)

  useEffect(() => {
    if (room?.metadata) {
      setGameState(room.metadata as T)
    }
  }, [room?.metadata])

  // Realtime subscription for game_events
  useEffect(() => {
    if (!roomId) return

    const channel = supabase.channel(`generic_game:${roomId}`)

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_events', filter: `room_id=eq.${roomId}` },
      (_payload) => {
        // Here we could trigger a callback if the game provided one
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        if (payload.new && (payload.new as any).metadata) {
          setGameState((payload.new as any).metadata as T)
        }
        
        // Desync detection: if the server metadata hash doesn't match our cache, trigger a refetch
        const serverChecksum = generateChecksum((payload.new as any).metadata);
        const localChecksum = generateChecksum(room?.metadata);
        
        if (serverChecksum !== localChecksum) {
          console.warn(`[Desync Detected] Server: ${serverChecksum} vs Local: ${localChecksum}. Recovering state...`);
          // Recover automatically
          void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) });
        }
      }
    )

    // Reconnection and recovery
    channel.on('system', { event: '*' }, (payload) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
        // Reconnected successfully. We must refetch in case we missed events while disconnected.
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) });
      }
    })

    // Also recover on browser focus
    const onFocus = () => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) });
    }
    window.addEventListener('focus', onFocus)

    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [roomId, room?.metadata, queryClient])

  const updateStateMutation = useMutation({
    mutationFn: async (newState: Partial<T>) => {
      if (!roomId) throw new Error('No room id')
      const merged = { ...((room?.metadata as any) || {}), ...newState }
      
      // Optimistic update for immediate UI response
      queryClient.setQueryData(lobbyKeys.room(roomId), (old: any) => {
        if (!old) return old
        return { ...old, metadata: merged }
      })

      const { error } = await supabase
        .from('game_rooms')
        .update({ metadata: merged })
        .eq('id', roomId)
      
      if (error) {
        // Rollback
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
        throw error
      }
      return merged
    }
  })

  const emitEvent = useCallback(async ({ type, payload }: { type: string; payload: any }) => {
    if (!roomId || !user) throw new Error('Missing room or user')
    const { error } = await supabase
      .from('game_events')
      .insert({
        room_id: roomId,
        user_id: user.id,
        type,
        payload
      })
    if (error) throw error
  }, [roomId, user])

  return {
    gameState,
    isLoading,
    isHost: room?.hostId === user?.id,
    updateGameState: updateStateMutation.mutateAsync,
    isUpdating: updateStateMutation.isPending,
    emitEvent,
  }
}
