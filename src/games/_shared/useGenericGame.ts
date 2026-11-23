import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase, isLocalDemoMode } from '@/lib/supabase'
import { DEMO_GUEST_ID } from '@/lib/localSupabase'
import { useRoom, lobbyKeys } from '@/hooks/useLobby'
import { useAuth } from '@/hooks/useAuth'
import { useOptionalToast } from '@/components/ui/Toast'
import { generateChecksum } from '@/platform/sync/syncEngine'
import { RoomExpiredError, getRoomWithPlayers } from '@/services/lobby/lobbyService'
import {
  getRoomPot,
  getRoomStake,
  lockRoomEscrow,
  settleRoomPayout,
} from '@/services/wallet/walletService'
import { getGameBySlug } from '../registry'
import type { BaseGameState } from '@/types/game'
import type { Json } from '@/types/database'
import type { GameRoom } from '@/types/lobby'

interface UseGenericGameOptions<T extends BaseGameState> {
  gameSlug?: string
  createInitialState?: (playerIds: string[], hostId: string) => T
}

export interface PlayerCardThemeSelection {
  frontThemeId?: string
  backThemeId?: string
  diceThemeId?: string
  coinThemeId?: string
}

interface CommitRpcRow {
  ok: boolean
  conflict: boolean
  state_version: number
  metadata: unknown
  state: GameRoom['state']
  last_activity_at: string
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
  const navigate = useNavigate()
  const { toast } = useOptionalToast()
  const { user, refreshProfile } = useAuth()

  const redirectedRef = useRef(false)
  const handleRoomGone = useCallback(
    (reason: 'deleted' | 'expired') => {
      if (redirectedRef.current) return
      redirectedRef.current = true
      toast(
        reason === 'expired'
          ? 'Ce salon a expiré après 30 minutes d’inactivité.'
          : 'Ce salon a été supprimé.',
        'info',
      )
      navigate('/games', { replace: true })
    },
    [navigate, toast],
  )

  const {
    data: room,
    isLoading,
    error: roomError,
    isDeleted: roomDeleted,
    refetch: refetchRoom,
  } = useRoom(roomId, {
    onRoomDeleted: () => handleRoomGone('deleted'),
  })

  const initialFromRoom = isInitializedState<T>(room?.metadata) ? room.metadata : null
  const [gameState, setGameState] = useState<T | null>(initialFromRoom)

  const metadataRef = useRef<unknown>(room?.metadata)
  const stateVersionRef = useRef<number>(room?.stateVersion ?? 0)
  const lastActivityRef = useRef<string>(room?.lastActivityAt ?? '')
  const actionLockRef = useRef(false)
  const autoInitRef = useRef(false)
  const escrowCheckRef = useRef(false)
  const payoutCheckRef = useRef(false)

  // Redirect if room expired or disappeared on fetch
  useEffect(() => {
    if (!roomError) return
    if (roomError instanceof RoomExpiredError || roomError.name === 'RoomExpiredError') {
      handleRoomGone('expired')
      return
    }
    const code = (roomError as { code?: string }).code
    if (code === 'PGRST116') {
      handleRoomGone('deleted')
    }
  }, [roomError, handleRoomGone])

  // Authoritative sync from room query (highest state_version ALWAYS wins, never blocked by lock)
  const adoptServerState = useCallback(
    (
      nextMeta: unknown,
      incomingVersion: number,
      incomingLastActivity?: string,
      incomingRoomState?: GameRoom['state'],
    ) => {
      if (!isInitializedState<T>(nextMeta)) return

      const currentVersion = stateVersionRef.current
      if (incomingVersion < currentVersion) {
        return
      }

      const incomingTs = incomingLastActivity ?? ''
      const isNewerVersion = incomingVersion > currentVersion
      const sameVersionNewerContent =
        incomingVersion === currentVersion &&
        !actionLockRef.current &&
        (incomingTs > lastActivityRef.current ||
          generateChecksum(nextMeta) !== generateChecksum(metadataRef.current))

      if (isNewerVersion || sameVersionNewerContent || !isInitializedState<T>(metadataRef.current)) {
        metadataRef.current = nextMeta
        stateVersionRef.current = incomingVersion
        if (incomingTs) lastActivityRef.current = incomingTs
        setGameState(nextMeta)

        queryClient.setQueryData<GameRoom>(lobbyKeys.room(roomId), (old) =>
          old
            ? {
                ...old,
                metadata: nextMeta as unknown as Record<string, unknown>,
                stateVersion: incomingVersion,
                ...(incomingTs ? { lastActivityAt: incomingTs } : {}),
                ...(incomingRoomState ? { state: incomingRoomState } : {}),
              }
            : old,
        )
      }
    },
    [queryClient, roomId],
  )

  useEffect(() => {
    if (!room) return
    adoptServerState(
      room.metadata,
      room.stateVersion ?? 0,
      room.lastActivityAt,
      room.state,
    )
  }, [room, adoptServerState])

  const playerProfiles = useMemo(() => {
    const map: Record<
      string,
      {
        username: string
        displayName: string
        avatarUrl: string | null
        clanTitle?: string | null
        isAdmin?: boolean
      }
    > = {}
    for (const p of room?.players ?? []) {
      map[p.userId] = {
        username: p.profile.username,
        displayName: p.profile.display_name || p.profile.username,
        avatarUrl: p.profile.avatar_url,
        clanTitle: p.profile.clan_title,
        isAdmin: p.profile.is_admin,
      }
    }
    if (isLocalDemoMode && !map[DEMO_GUEST_ID]) {
      map[DEMO_GUEST_ID] = {
        username: 'sam_challenger',
        displayName: 'Sam Chen',
        avatarUrl: null,
        clanTitle: 'Clan Jabami',
        isAdmin: false,
      }
    }
    return map
  }, [room?.players])

  const playerThemes = useMemo(() => {
    const map: Record<string, PlayerCardThemeSelection> = {}
    for (const p of room?.players ?? []) {
      map[p.userId] = {
        frontThemeId: p.profile.card_front_theme,
        backThemeId: p.profile.card_back_theme,
        diceThemeId: p.profile.dice_theme,
        coinThemeId: p.profile.coin_theme,
      }
    }
    return map
  }, [room?.players])

  const roomStakeYen = getRoomStake(room)
  const roomPotYen = getRoomPot(room)

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

  // Realtime subscription + mobile reconnect + 2-second safety poll while match is active
  useEffect(() => {
    if (!roomId) return

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    let isSubscribed = false

    const syncGameState = () => {
      if (!active) return
      if (typeof refetchRoom === 'function') {
        void refetchRoom()
      } else {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
      }
    }

    const buildAndSubscribe = () => {
      if (!active) return
      if (channel) {
        void supabase.removeChannel(channel)
        channel = null
      }
      isSubscribed = false

      channel = supabase.channel(`generic_game:${roomId}`)

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
          const nextRow = payload.new as
            | {
                metadata?: unknown
                state?: GameRoom['state']
                state_version?: number
                last_activity_at?: string
              }
            | undefined
          if (!nextRow) return
          const incomingVersion =
            typeof nextRow.state_version === 'number'
              ? nextRow.state_version
              : stateVersionRef.current + 1
          adoptServerState(
            nextRow.metadata,
            incomingVersion,
            nextRow.last_activity_at,
            nextRow.state,
          )
        },
      )

      channel.on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => {
          handleRoomGone('deleted')
        },
      )

      channel.on('system', { event: '*' }, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
          syncGameState()
        }
      })

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          syncGameState()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSubscribed = false
        }
      })
    }

    buildAndSubscribe()

    const handleWake = () => {
      if (!active) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const chState = (channel as unknown as { state?: string } | null)?.state
      if (!isSubscribed || (chState !== 'joined' && chState !== 'joining')) {
        buildAndSubscribe()
      }
      syncGameState()
    }

    // 2-second safety poll while match is active and tab is visible
    const pollInterval = window.setInterval(() => {
      if (!active) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const curMeta = metadataRef.current as { status?: string } | null
      if (curMeta?.status === 'finished') return
      syncGameState()
    }, 2000)

    window.addEventListener('focus', handleWake)
    window.addEventListener('online', handleWake)
    document.addEventListener('visibilitychange', handleWake)

    return () => {
      active = false
      window.clearInterval(pollInterval)
      if (channel) {
        void supabase.removeChannel(channel)
        channel = null
      }
      window.removeEventListener('focus', handleWake)
      window.removeEventListener('online', handleWake)
      document.removeEventListener('visibilitychange', handleWake)
    }
  }, [roomId, queryClient, refetchRoom, adoptServerState, handleRoomGone])

  /**
   * Atomically commits a state transition using commit_game_state RPC.
   * On version conflict (e.g. simultaneous J1/J2 choices), reloads the authoritative
   * server state returned by the RPC and replays the reducer cleanly so neither
   * player's move is ever lost or silently rejected.
   */
  const commitWithRetry = useCallback(
    async (
      computeNext: (
        latestState: T | null,
      ) => (Partial<T> & { markRoomFinished?: boolean }) | null,
    ): Promise<T | null> => {
      if (!roomId) throw new Error('No room id')
      if (actionLockRef.current) {
        throw new Error('Action already in progress')
      }
      actionLockRef.current = true
      try {
        const MAX_ATTEMPTS = 4
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const base = isInitializedState<T>(metadataRef.current)
            ? metadataRef.current
            : gameState
          const computed = computeNext(base)
          if (!computed) return base

          const { markRoomFinished, ...statePatch } = computed
          const merged = { ...(base ?? {}), ...statePatch } as T
          const expectedVersion = stateVersionRef.current

          const rpcClient = supabase as unknown as {
            rpc?: (
              fn: string,
              args: Record<string, unknown>,
            ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>
          }

          if (typeof rpcClient.rpc === 'function') {
            const { data, error } = await rpcClient.rpc('commit_game_state', {
              p_room_id: roomId,
              p_new_metadata: merged as unknown as Json,
              p_expected_version: expectedVersion,
              p_mark_finished: Boolean(markRoomFinished),
            })

            if (error) {
              if (error.message?.includes('ROOM_NOT_FOUND')) {
                handleRoomGone('deleted')
              }
              void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
              throw new Error(error.message || 'Impossible de sauvegarder l’action.')
            }

            const rows = (Array.isArray(data) ? data : data ? [data] : []) as CommitRpcRow[]
            const row = rows[0]

            if (!row) {
              void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
              throw new Error('Aucune ligne mise à jour en base (permission ou salon introuvable).')
            }

            if (row.conflict) {
              // Adopt authoritative server state and retry reducer on latest state
              adoptServerState(row.metadata, row.state_version, row.last_activity_at, row.state)
              continue
            }

            if (row.ok) {
              adoptServerState(row.metadata, row.state_version, row.last_activity_at, row.state)
              return row.metadata as T
            }
          } else {
            // Fallback for environments where rpc is not mocked
            const updatePayload: { metadata: Json; state?: 'finished' } = {
              metadata: merged as unknown as Json,
            }
            if (markRoomFinished) updatePayload.state = 'finished'

            const { data: updatedRows, error } = await supabase
              .from('game_rooms')
              .update(updatePayload)
              .eq('id', roomId)
              .select('id, metadata, state, state_version, last_activity_at')

            if (error || !updatedRows || updatedRows.length === 0) {
              void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
              throw error ?? new Error('Mise à jour refusée : aucune ligne modifiée.')
            }

            const updated = updatedRows[0] as unknown as {
              metadata: unknown
              state: GameRoom['state']
              state_version?: number
              last_activity_at?: string
            }
            adoptServerState(
              updated.metadata,
              updated.state_version ?? expectedVersion + 1,
              updated.last_activity_at,
              updated.state,
            )
            return updated.metadata as T
          }
        }

        // After repeated conflicts, sync fresh room from server and report clearly
        const fresh = await getRoomWithPlayers(roomId)
        adoptServerState(fresh.metadata, fresh.stateVersion ?? 0, fresh.lastActivityAt, fresh.state)
        throw new Error('Conflit de synchronisation — état rechargé, veuillez réessayer.')
      } finally {
        actionLockRef.current = false
      }
    },
    [roomId, gameState, queryClient, adoptServerState, handleRoomGone],
  )

  const updateStateMutation = useMutation({
    mutationFn: async (newState: Partial<T> & { markRoomFinished?: boolean }) =>
      commitWithRetry(() => newState),
  })

  const applyActionMutation = useMutation({
    mutationFn: async (
      reducer: (latestState: T) => (Partial<T> & { markRoomFinished?: boolean }) | null,
    ) =>
      commitWithRetry((latest) => {
        if (!latest) return null
        return reducer(latest)
      }),
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

  // Lock Yen escrow once game starts (host only, idempotent)
  useEffect(() => {
    if (!roomId || !room || !isHost) return
    if (roomStakeYen <= 0) return
    if (room.metadata?.escrowLocked === true || escrowCheckRef.current) return

    escrowCheckRef.current = true
    void lockRoomEscrow(roomId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
        void refreshProfile?.()
      })
      .catch(() => {
        escrowCheckRef.current = false
      })
  }, [roomId, room, isHost, roomStakeYen, queryClient, refreshProfile])

  // Settle Yen payout once game finishes (host only, idempotent)
  useEffect(() => {
    if (!roomId || !room || !isHost || !gameState) return
    if (roomStakeYen <= 0) return
    const isFinished = gameState.status === 'finished' || gameState.status === 'result'
    const gameEnded =
      room.gameSlug === 'saving-throw' ? gameState.status === 'finished' : isFinished
    if (!gameEnded) return
    if (room.metadata?.payoutSettled === true || payoutCheckRef.current) return

    const rawState = gameState as unknown as Record<string, unknown>
    const winnerId = (rawState.winnerId ?? rawState.gameWinnerId ?? null) as string | null

    payoutCheckRef.current = true
    void settleRoomPayout(roomId, winnerId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
        void refreshProfile?.()
      })
      .catch(() => {
        payoutCheckRef.current = false
      })
  }, [roomId, room, isHost, gameState, roomStakeYen, queryClient, refreshProfile])

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
    escrowCheckRef.current = false
    payoutCheckRef.current = false
    await updateStateMutation.mutateAsync({
      ...fresh,
      escrowLocked: false,
      payoutSettled: false,
    } as Partial<T>)
    await emitEvent({ type: 'game_started', payload: { players: playerIds, rematch: true } })
  }, [room, isHost, options?.gameSlug, updateStateMutation, emitEvent])

  return {
    room,
    gameState,
    stateVersion: stateVersionRef.current,
    roomDeleted,
    isLoading,
    isHost,
    playerProfiles,
    playerThemes,
    roomStakeYen,
    roomPotYen,
    updateGameState: updateStateMutation.mutateAsync,
    applyGameAction: applyActionMutation.mutateAsync,
    isUpdating: updateStateMutation.isPending || applyActionMutation.isPending,
    emitEvent,
    resetMatch,
  }
}
