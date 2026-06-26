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
  getOutgoingInvites,
  getRoom,
  inviteFriend,
  joinRoom,
  kickPlayer,
  launchGame,
  leaveRoom,
  setReady,
} from '@/services/lobby/lobbyService'
import { subscribeToInvitations, subscribeToRoom } from '@/services/lobby/lobbyRealtime'
import type { GameInvitation, GameRoom } from '@/types/lobby'

// ─────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────

export const lobbyKeys = {
  all: ['lobby'] as const,
  games: () => [...lobbyKeys.all, 'games'] as const,
  room: (roomId: string) => [...lobbyKeys.all, 'room', roomId] as const,
  invites: (userId: string) => [...lobbyKeys.all, 'invites', userId] as const,
  outgoingInvites: (roomId: string) => [...lobbyKeys.all, 'outgoing-invites', roomId] as const,
}

// ─────────────────────────────────────────────
// Games catalog
// ─────────────────────────────────────────────

/**
 * Fetches all enabled games from the catalog.
 */
export function useGames() {
  return useQuery({
    queryKey: lobbyKeys.games(),
    queryFn: getGames,
    staleTime: 1000 * 60 * 10, // 10 minutes — catalog rarely changes
  })
}

// ─────────────────────────────────────────────
// Room
// ─────────────────────────────────────────────

/**
 * Fetches a room with players and subscribes to realtime updates.
 * Triggers a full refetch on room_players changes (insert/update/delete).
 * Applies room row updates directly to the cache without refetch.
 */
export function useRoom(roomId: string) {
  const queryClient = useQueryClient()
  const key = lobbyKeys.room(roomId)

  const query = useQuery({
    queryKey: key,
    queryFn: () => getRoom(roomId),
    enabled: Boolean(roomId),
    staleTime: 0, // always fresh — realtime keeps it up to date
  })

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId) return

    return subscribeToRoom(roomId, {
      onRoomChange: (partial) => {
        queryClient.setQueryData<GameRoom>(key, (old) =>
          old ? { ...old, ...partial } : old,
        )
      },
      onPlayersChange: () => {
        void queryClient.invalidateQueries({ queryKey: key })
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, queryClient])

  return query
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

/**
 * Fetches pending invitations for the current user and subscribes to new ones.
 * New invitations arrive via realtime and are prepended to the cache.
 */
export function useInvites() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = lobbyKeys.invites(user?.id ?? '')

  const query = useQuery({
    queryKey: key,
    queryFn: getInvites,
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (!user) return

    return subscribeToInvitations((invite) => {
      // Only handle invites addressed to the current user
      if (invite.receiverId !== user.id) return

      queryClient.setQueryData<GameInvitation[]>(key, (old = []) => {
        // Avoid duplicates
        if (old.some((i) => i.id === invite.id)) return old
        return [invite, ...old]
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, queryClient])

  return query
}

// ─────────────────────────────────────────────
// Main hook — aggregates mutations and queries
// ─────────────────────────────────────────────

/**
 * useLobby — primary lobby hook.
 *
 * Exposes all lobby operations as callbacks and query results.
 * For room-specific features (realtime players, outgoing invites),
 * use useRoom() and useOutgoingInvites() directly.
 */
export function useLobby() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: games = [], isLoading: isGamesLoading } = useGames()
  const { data: invites = [], isLoading: isInvitesLoading } = useInvites()

  // ── Create Room ───────────────────────────────────────────────────────────
  const createRoomMutation = useMutation({
    mutationFn: ({ gameSlug, maxPlayers }: { gameSlug: string; maxPlayers?: number }) =>
      createRoom(gameSlug, maxPlayers),
    onSuccess: (room) => {
      queryClient.setQueryData(lobbyKeys.room(room.id), room)
      navigate(`/room/${room.id}`)
    },
  })

  // ── Join Room ─────────────────────────────────────────────────────────────
  const joinRoomMutation = useMutation({
    mutationFn: (roomId: string) => joinRoom(roomId),
    onSuccess: (_, roomId) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
    },
  })

  // ── Leave Room ────────────────────────────────────────────────────────────
  const leaveRoomMutation = useMutation({
    mutationFn: (roomId: string) => leaveRoom(roomId),
    onSuccess: (_, roomId) => {
      queryClient.removeQueries({ queryKey: lobbyKeys.room(roomId) })
      navigate('/games')
    },
  })

  // ── Set Ready ─────────────────────────────────────────────────────────────
  const setReadyMutation = useMutation({
    mutationFn: ({ roomId, ready }: { roomId: string; ready: boolean }) =>
      setReady(roomId, ready),
    onSuccess: (_, { roomId }) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
    },
  })

  // ── Launch Game ───────────────────────────────────────────────────────────
  const launchGameMutation = useMutation({
    mutationFn: (roomId: string) => launchGame(roomId),
    onSuccess: (_, roomId) => {
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
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
      // Remove from incoming invites cache
      if (user) {
        queryClient.setQueryData<GameInvitation[]>(lobbyKeys.invites(user.id), (old = []) =>
          old.filter((i) => i.id !== inviteId),
        )
      }
      if (roomId) navigate(`/room/${roomId}`)
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
    (gameSlug: string, maxPlayers?: number) =>
      createRoomMutation.mutateAsync({ gameSlug, maxPlayers }),
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
    // Queries
    games,
    invites,
    isGamesLoading,
    isInvitesLoading,

    // Room mutations
    createRoom: handleCreateRoom,
    isCreatingRoom: createRoomMutation.isPending,
    joinRoom: handleJoinRoom,
    leaveRoom: handleLeaveRoom,
    setReady: handleSetReady,
    launchGame: handleLaunchGame,
    kickPlayer: handleKick,

    // Invitation mutations
    invite: handleInvite,
    accept: handleAccept,
    decline: handleDecline,
    cancelInvite: handleCancel,
  }
}
