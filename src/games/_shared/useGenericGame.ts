import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase, isLocalDemoMode } from '@/lib/supabase'
import { DEMO_GUEST_ID } from '@/lib/localSupabase'
import { useRoom, lobbyKeys } from '@/hooks/useLobby'
import { useAuth } from '@/hooks/useAuth'
import { generateChecksum } from '@/platform/sync/syncEngine'
import { getGameBySlug } from '../registry'
import type { BaseGameState } from '@/types/game'
import type { Json } from '@/types/database'

interface UseGenericGameOptions<T extends BaseGameState> {
  gameSlug?: string
  createInitialState?: (playerIds: string[], hostId: string) => T
}

function isInitializedState<T extends BaseGameState>(meta: unknown): meta is T {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false
  const record = meta as Record<string, unknown>
  return (
    typeof record.status === 'string' &&
    typeof record.playersRecord === 'object' &&
    record.playersRecord !== null
  )
}

export function useGenericGame<T extends BaseGameState>(
  roomId: string,
  options?: UseGenericGameOptions<T>,
) {
  const queryClient = useQueryClient()
  const { data: room, isLoading } = useRoom(roomId)
  const { user } = useAuth()

  const initialFromRoom = isInitializedState<T>(room?.metadata) ? room.metadata : null
  const [gameState, setGameState] = useState<T | null>(initialFromRoom)

  const metadataRef = useRef<unknown>(room?.metadata)
  const actionLockRef = useRef(false)
  const autoInitRef = useRef(false)

  useEffect(() => {
    metadataRef.current = room?.metadata
    if (isInitializedState<T>(room?.metadata)) {
      setGameState(room.metadata)
    }
  }, [room?.metadata])

  const playerProfiles = useMemo(() => {
    const map: Record<string, { username: string; displayName: string; avatarUrl: string | null }> = {}
    for (const p of room?.players ?? []) {
      map[p.userId] = {
        username: p.profile.username,
        displayName: p.profile.display_name || p.profile.username,
        avatarUrl: p.profile.avatar_url,
      }
    }
    if (isLocalDemoMode && !map[DEMO_GUEST_ID]) {
      map[DEMO_GUEST_ID] = {
        username: 'sam_challenger',
        displayName: 'Sam Chen',
        avatarUrl: null,
      }
    }
    return map
  }, [room?.players])

  const emitEvent = useCallback(
    async ({ type, payload }: { type: string; payload: Record<string, unknown> }) => {
      if (!roomId || !user) return
      const { error } = await supabase.from('game_events').insert({
        room_id: roomId,
        user_id: user.id,
        type,
        payload: payload as Json,
      })
      if (error) {
        console.warn('[useGenericGame] Failed to emit event:', error.message)
      }
    },
    [roomId, user],
  )

  // Realtime subscription for game_rooms metadata & game_events
  useEffect(() => {
    if (!roomId) return

    const channel = supabase.channel(`generic_game:${roomId}`)

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_events', filter: `room_id=eq.${roomId}` },
      () => {
        // Events are logged for replay & diagnostics
      },
    )

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        const nextRow = payload.new as { metadata?: unknown; state?: string } | undefined
        if (nextRow && isInitializedState<T>(nextRow.metadata)) {
          setGameState(nextRow.metadata)

          const serverChecksum = generateChecksum(nextRow.metadata)
          const localChecksum = generateChecksum(metadataRef.current)
          if (serverChecksum !== localChecksum) {
            void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
          }
        }
      },
    )

    channel.on('system', { event: '*' }, (payload: { extension?: string; status?: string }) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
      }
    })

    const onFocus = () => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
    }
    window.addEventListener('focus', onFocus)

    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [roomId, queryClient])

  const updateStateMutation = useMutation({
    mutationFn: async (newState: Partial<T> & { markRoomFinished?: boolean }) => {
      if (!roomId) throw new Error('No room id')
      if (actionLockRef.current) {
        throw new Error('Action already in progress')
      }
      actionLockRef.current = true
      try {
        const { markRoomFinished, ...statePatch } = newState
        const base = isInitializedState<T>(metadataRef.current)
          ? metadataRef.current
          : (gameState ?? {})
        const merged = { ...base, ...statePatch } as T

        setGameState(merged)
        metadataRef.current = merged

        queryClient.setQueryData(lobbyKeys.room(roomId), (old: Record<string, unknown> | undefined) => {
          if (!old) return old
          return {
            ...old,
            metadata: merged,
            ...(markRoomFinished ? { state: 'finished' } : {}),
          }
        })

        const updatePayload: { metadata: Json; state?: 'finished' } = {
          metadata: merged as unknown as Json,
        }
        if (markRoomFinished) {
          updatePayload.state = 'finished'
        }

        const { error } = await supabase
          .from('game_rooms')
          .update(updatePayload)
          .eq('id', roomId)

        if (error) {
          void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
          throw error
        }

        return merged
      } finally {
        actionLockRef.current = false
      }
    },
  })

  // Auto-initialize game state on mount if host enters an uninitialized room
  const isHost = room?.hostId === user?.id
  const createInitialRef = useRef(options?.createInitialState)
  createInitialRef.current = options?.createInitialState

  useEffect(() => {
    if (!room || !user || !isHost) return
    if (isInitializedState<T>(room.metadata)) return
    if (autoInitRef.current) return

    const playerIds = room.players.map((p) => p.userId)
    if (playerIds.length < 2 && isLocalDemoMode) {
      if (!playerIds.includes(DEMO_GUEST_ID)) {
        playerIds.push(DEMO_GUEST_ID)
      }
    }
    if (playerIds.length < 2) return

    const plugin = getGameBySlug(options?.gameSlug ?? room.gameSlug)
    const initial = createInitialRef.current
      ? createInitialRef.current(playerIds, room.hostId)
      : (plugin?.launch?.(playerIds) as T | undefined)

    if (!initial || !isInitializedState<T>(initial)) return

    autoInitRef.current = true
    void updateStateMutation
      .mutateAsync(initial)
      .then(() => emitEvent({ type: 'game_started', payload: { players: playerIds } }))
      .catch(() => {
        autoInitRef.current = false
      })
  }, [room, user, isHost, options?.gameSlug, updateStateMutation, emitEvent])

  const resetMatch = useCallback(async () => {
    if (!room || !isHost) return
    const playerIds = room.players.map((p) => p.userId)
    if (playerIds.length < 2 && isLocalDemoMode && !playerIds.includes(DEMO_GUEST_ID)) {
      playerIds.push(DEMO_GUEST_ID)
    }
    const plugin = getGameBySlug(options?.gameSlug ?? room.gameSlug)
    const fresh = createInitialRef.current
      ? createInitialRef.current(playerIds, room.hostId)
      : (plugin?.launch?.(playerIds) as T | undefined)
    if (!fresh) return
    await updateStateMutation.mutateAsync(fresh)
    await emitEvent({ type: 'game_started', payload: { players: playerIds, rematch: true } })
  }, [room, isHost, options?.gameSlug, updateStateMutation, emitEvent])

  return {
    room,
    gameState,
    isLoading,
    isHost,
    playerProfiles,
    updateGameState: updateStateMutation.mutateAsync,
    isUpdating: updateStateMutation.isPending,
    emitEvent,
    resetMatch,
  }
}
