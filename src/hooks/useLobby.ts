import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  acceptInvite,
  cancelInvite,
  createRoom,
  declineInvite,
  getGames,
  getInvites,
  getMyActiveRooms,
  getOutgoingInvites,
  getPublicRooms,
  getRoomWithPlayers,
  inviteFriend,
  joinRoom,
  kickPlayer,
  launchGame,
  leaveRoom,
  setReady,
  updateRoomVisibility,
} from '@/services/lobby/lobbyService'
import {
  subscribeToInvitations,
  subscribeToPublicRooms,
  subscribeToRoom,
} from '@/services/lobby/lobbyRealtime'
import type { GameInvitation, GameRoom, RoomPlayerChangeEvent } from '@/types/lobby'

// ─────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────

export const lobbyKeys = {
  all: ['lobby'] as const,
  games: () => [...lobbyKeys.all, 'games'] as const,
  room: (roomId: string) => [...lobbyKeys.all, 'room', roomId] as const,
  publicRooms: () => [...lobbyKeys.all, 'public-rooms'] as const,
  myActiveRooms: (userId: string) => [...lobbyKeys.all, 'my-active-rooms', userId] as const,
  invites: (userId: string) => [...lobbyKeys.all, 'invites', userId] as const,
  outgoingInvites: (roomId: string) => [...lobbyKeys.all, 'outgoing-invites', roomId] as const,
}

function recomputeLobbyRoomState(room: GameRoom): GameRoom {
  if (room.state !== 'waiting' && room.state !== 'ready') return room
  const total = room.players.length
  const allReady = total >= 2 && room.players.every((p) => p.ready)
  const nextState: GameRoom['state'] = allReady ? 'ready' : 'waiting'
  if (room.state === nextState) return room
  return { ...room, state: nextState }
}

// ─────────────────────────────────────────────
// Games catalog
// ─────────────────────────────────────────────

export function useGames() {
  return useQuery({
    queryKey: lobbyKeys.games(),
    queryFn: getGames,
    staleTime: 1000 * 60 * 10,
  })
}

// ─────────────────────────────────────────────
// Room (realtime + mobile wake sync)
// ─────────────────────────────────────────────

export function useRoom(roomId: string) {
  const queryClient = useQueryClient()
  const key = lobbyKeys.room(roomId)

  const query = useQuery({
    queryKey: key,
    queryFn: () => getRoomWithPlayers(roomId),
    enabled: Boolean(roomId),
    staleTime: 0,
  })

  useEffect(() => {
    if (!roomId) return

    const syncNow = () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.outgoingInvites(roomId) })
    }

    const unsubscribe = subscribeToRoom(roomId, {
      onRoomChange: (partial) => {
        queryClient.setQueryData<GameRoom>(key, (old) => (old ? { ...old, ...partial } : old))
        if (partial.state === 'playing') {
          syncNow()
        }
      },
      onPlayersChange: (change?: RoomPlayerChangeEvent) => {
        // Immediately patch ready/removal in React state for zero-delay UI feedback
        if (change?.eventType === 'UPDATE' && change.userId && typeof change.ready === 'boolean') {
          queryClient.setQueryData<GameRoom>(key, (old) => {
            if (!old) return old
            const nextPlayers = old.players.map((p) =>
              p.userId === change.userId ? { ...p, ready: change.ready! } : p,
            )
            return recomputeLobbyRoomState({ ...old, players: nextPlayers })
          })
        } else if (change?.eventType === 'DELETE' && change.userId) {
          queryClient.setQueryData<GameRoom>(key, (old) => {
            if (!old) return old
            const nextPlayers = old.players.filter((p) => p.userId !== change.userId)
            return recomputeLobbyRoomState({ ...old, players: nextPlayers })
          })
        }
        // Always refetch full room + players profiles (avatar, clan, Yen, themes)
        syncNow()
      },
      onGameStarted: () => {
        queryClient.setQueryData<GameRoom>(key, (old) =>
          old ? { ...old, state: 'playing' } : old,
        )
        syncNow()
      },
      onChannelSubscribed: () => {
        syncNow()
      },
    })

    const onWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      syncNow()
    }
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)
    document.addEventListener('visibilitychange', onWake)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, queryClient])

  return query
}

// ─────────────────────────────────────────────
// Public Rooms & My Active Rooms
// ─────────────────────────────────────────────

export function usePublicRooms(enabled = true) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const active = Boolean(user) && enabled

  const publicQuery = useQuery({
    queryKey: lobbyKeys.publicRooms(),
    queryFn: getPublicRooms,
    enabled: active,
    staleTime: 0,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'hidden' ? false : 4000,
  })

  const myActiveQuery = useQuery({
    queryKey: lobbyKeys.myActiveRooms(user?.id ?? ''),
    queryFn: getMyActiveRooms,
    enabled: active,
    staleTime: 0,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'hidden' ? false : 4000,
  })

  useEffect(() => {
    if (!active || !user) return

    const syncRooms = () => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.publicRooms() })
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.myActiveRooms(user.id) })
    }

    const unsubscribe = subscribeToPublicRooms(syncRooms)

    const onWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      syncRooms()
    }
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)
    document.addEventListener('visibilitychange', onWake)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [active, user, queryClient])

  return {
    publicRooms: publicQuery.data ?? [],
    myActiveRooms: myActiveQuery.data ?? [],
    isLoading: publicQuery.isLoading || myActiveQuery.isLoading,
    refetch: () => {
      void publicQuery.refetch()
      void myActiveQuery.refetch()
    },
  }
}

// ─────────────────────────────────────────────
// Outgoing invites for a room
// ─────────────────────────────────────────────

export function useOutgoingInvites(roomId: string) {
  return useQuery({
    queryKey: lobbyKeys.outgoingInvites(roomId),
    queryFn: () => getOutgoingInvites(roomId),
    enabled: Boolean(roomId),
    staleTime: 1000 * 30,
  })
}

// ─────────────────────────────────────────────
// Incoming invitations
// ─────────────────────────────────────────────

export function useInvites() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = lobbyKeys.invites(user?.id ?? '')

  const query = useQuery({
    queryKey: key,
    queryFn: getInvites,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToInvitations((invite) => {
      if (invite.receiverId !== user.id) return

      queryClient.setQueryData<GameInvitation[]>(key, (old = []) => {
        if (old.some((i) => i.id === invite.id)) return old
        return [invite, ...old]
      })
      void queryClient.invalidateQueries({ queryKey: key })
    })

    const onWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void queryClient.invalidateQueries({ queryKey: key })
    }
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)
    document.addEventListener('visibilitychange', onWake)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, queryClient])

  return query
}

// ─────────────────────────────────────────────
// Main hook — aggregates mutations and queries
// ─────────────────────────────────────────────

export function useLobby(options?: { includePublicRooms?: boolean }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: games = [], isLoading: isGamesLoading } = useGames()
  const { data: invites = [], isLoading: isInvitesLoading } = useInvites()
  const {
    publicRooms,
    myActiveRooms,
    isLoading: isRoomsLoading,
    refetch: refetchRooms,
  } = usePublicRooms(Boolean(options?.includePublicRooms))

  // ── Create Room ───────────────────────────────────────────────────────────
  const createRoomMutation = useMutation({
    mutationFn: ({
      gameSlug,
      maxPlayers,
      isPublic,
    }: {
      gameSlug: string
      maxPlayers?: number
      isPublic?: boolean
    }) => createRoom(gameSlug, maxPlayers, isPublic),
    onSuccess: (room) => {
      queryClient.setQueryData(lobbyKeys.room(room.id), room)
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.publicRooms() })
      if (user) {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.myActiveRooms(user.id) })
      }
      navigate(`/room/${room.id}`)
    },
  })

  // ── Join Room ─────────────────────────────────────────────────────────────
  const joinRoomMutation = useMutation({
    mutationFn: (roomId: string) => joinRoom(roomId),
    onSuccess: (_, roomId) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.publicRooms() })
      if (user) {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.myActiveRooms(user.id) })
      }
    },
  })

  // ── Leave Room ────────────────────────────────────────────────────────────
  const leaveRoomMutation = useMutation({
    mutationFn: (roomId: string) => leaveRoom(roomId),
    onSuccess: (_, roomId) => {
      queryClient.removeQueries({ queryKey: lobbyKeys.room(roomId) })
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.publicRooms() })
      if (user) {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.myActiveRooms(user.id) })
      }
      navigate('/games')
    },
  })

  // ── Set Ready (optimistic + authoritative refetch) ────────────────────────
  const setReadyMutation = useMutation({
    mutationFn: ({ roomId, ready }: { roomId: string; ready: boolean }) =>
      setReady(roomId, ready),
    onMutate: async ({ roomId, ready }) => {
      if (!user) return
      const key = lobbyKeys.room(roomId)
      queryClient.setQueryData<GameRoom>(key, (old) => {
        if (!old) return old
        const nextPlayers = old.players.map((p) =>
          p.userId === user.id ? { ...p, ready } : p,
        )
        return recomputeLobbyRoomState({ ...old, players: nextPlayers })
      })
    },
    onSettled: (_, __, { roomId }) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
    },
  })

  // ── Update Room Visibility ────────────────────────────────────────────────
  const updateVisibilityMutation = useMutation({
    mutationFn: ({ roomId, isPublic }: { roomId: string; isPublic: boolean }) =>
      updateRoomVisibility(roomId, isPublic),
    onSuccess: (_, { roomId, isPublic }) => {
      queryClient.setQueryData<GameRoom>(lobbyKeys.room(roomId), (old) =>
        old ? { ...old, isPublic } : old,
      )
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.publicRooms() })
    },
  })

  // ── Launch Game ───────────────────────────────────────────────────────────
  const launchGameMutation = useMutation({
    mutationFn: (roomId: string) => launchGame(roomId),
    onSuccess: (_, roomId) => {
      queryClient.setQueryData<GameRoom>(lobbyKeys.room(roomId), (old) =>
        old ? { ...old, state: 'playing' } : old,
      )
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.publicRooms() })
    },
  })

  // ── Kick Player ───────────────────────────────────────────────────────────
  const kickPlayerMutation = useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      kickPlayer(roomId, userId),
    onSuccess: (_, { roomId }) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
    },
  })

  // ── Invite ────────────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: ({
      roomId,
      receiverId,
      gameSlug,
    }: {
      roomId: string
      receiverId: string
      gameSlug: string
    }) => inviteFriend(roomId, receiverId, gameSlug),
    onSuccess: (_, { roomId }) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.outgoingInvites(roomId) })
    },
  })

  // ── Accept Invite ─────────────────────────────────────────────────────────
  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) => acceptInvite(inviteId),
    onSuccess: (roomId, inviteId) => {
      if (user) {
        queryClient.setQueryData<GameInvitation[]>(lobbyKeys.invites(user.id), (old = []) =>
          old.filter((i) => i.id !== inviteId),
        )
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.myActiveRooms(user.id) })
      }
      if (roomId) {
        void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
        navigate(`/room/${roomId}`)
      }
    },
  })

  // ── Decline Invite ────────────────────────────────────────────────────────
  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) => declineInvite(inviteId),
    onSuccess: (_, inviteId) => {
      if (user) {
        queryClient.setQueryData<GameInvitation[]>(lobbyKeys.invites(user.id), (old = []) =>
          old.filter((i) => i.id !== inviteId),
        )
      }
    },
  })

  // ── Cancel Invite ─────────────────────────────────────────────────────────
  const cancelInviteMutation = useMutation({
    mutationFn: ({ inviteId, roomId }: { inviteId: string; roomId: string }) =>
      cancelInvite(inviteId).then(() => roomId),
    onSuccess: (roomId) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.outgoingInvites(roomId) })
    },
  })

  // ── Stable callbacks ──────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(
    (gameSlug: string, maxPlayers?: number, isPublic?: boolean) =>
      createRoomMutation.mutateAsync({ gameSlug, maxPlayers, isPublic }),
    [createRoomMutation],
  )
  const handleJoinRoom = useCallback(
    (roomId: string) => joinRoomMutation.mutateAsync(roomId),
    [joinRoomMutation],
  )
  const handleLeaveRoom = useCallback(
    (roomId: string) => leaveRoomMutation.mutateAsync(roomId),
    [leaveRoomMutation],
  )
  const handleSetReady = useCallback(
    (roomId: string, ready: boolean) => setReadyMutation.mutateAsync({ roomId, ready }),
    [setReadyMutation],
  )
  const handleUpdateVisibility = useCallback(
    (roomId: string, isPublic: boolean) =>
      updateVisibilityMutation.mutateAsync({ roomId, isPublic }),
    [updateVisibilityMutation],
  )
  const handleLaunchGame = useCallback(
    (roomId: string) => launchGameMutation.mutateAsync(roomId),
    [launchGameMutation],
  )
  const handleKick = useCallback(
    (roomId: string, userId: string) => kickPlayerMutation.mutateAsync({ roomId, userId }),
    [kickPlayerMutation],
  )
  const handleInvite = useCallback(
    (roomId: string, receiverId: string, gameSlug: string) =>
      inviteMutation.mutateAsync({ roomId, receiverId, gameSlug }),
    [inviteMutation],
  )
  const handleAccept = useCallback(
    (inviteId: string) => acceptInviteMutation.mutateAsync(inviteId),
    [acceptInviteMutation],
  )
  const handleDecline = useCallback(
    (inviteId: string) => declineInviteMutation.mutateAsync(inviteId),
    [declineInviteMutation],
  )
  const handleCancel = useCallback(
    (inviteId: string, roomId: string) => cancelInviteMutation.mutateAsync({ inviteId, roomId }),
    [cancelInviteMutation],
  )

  return {
    games,
    invites,
    publicRooms,
    myActiveRooms,
    isGamesLoading,
    isInvitesLoading,
    isRoomsLoading,
    refetchRooms,

    createRoom: handleCreateRoom,
    isCreatingRoom: createRoomMutation.isPending,
    joinRoom: handleJoinRoom,
    leaveRoom: handleLeaveRoom,
    setReady: handleSetReady,
    updateRoomVisibility: handleUpdateVisibility,
    launchGame: handleLaunchGame,
    kickPlayer: handleKick,

    invite: handleInvite,
    accept: handleAccept,
    decline: handleDecline,
    cancelInvite: handleCancel,
  }
}
