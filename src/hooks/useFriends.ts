import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  acceptRequest,
  cancelRequest,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  rejectRequest,
  removeFriend,
  searchUsers,
  sendRequest,
} from '@/services/friends/friendsService'
import type { Friend, FriendRequest, UserSearchResult } from '@/types/friends'

// ─────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────

export const friendKeys = {
  all: ['friends'] as const,
  lists: () => [...friendKeys.all, 'list'] as const,
  friends: (userId: string) => [...friendKeys.lists(), 'friends', userId] as const,
  incoming: (userId: string) => [...friendKeys.lists(), 'incoming', userId] as const,
  outgoing: (userId: string) => [...friendKeys.lists(), 'outgoing', userId] as const,
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * Primary friends hook.
 *
 * Manages:
 * - Friend list
 * - Incoming/outgoing requests
 * - Search results (debounced)
 * - All mutations with optimistic updates + rollback
 */
export function useFriends() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? ''

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: friends = [], isLoading: isLoadingFriends } = useQuery({
    queryKey: friendKeys.friends(userId),
    queryFn: () => getFriends(userId),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  })

  const { data: incomingRequests = [], isLoading: isLoadingIncoming } = useQuery({
    queryKey: friendKeys.incoming(userId),
    queryFn: () => getIncomingRequests(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
  })

  const { data: outgoingRequests = [], isLoading: isLoadingOutgoing } = useQuery({
    queryKey: friendKeys.outgoing(userId),
    queryFn: () => getOutgoingRequests(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
  })

  // ── Search state (local, debounced by caller) ─────────────────────────────

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(
    async (query: string) => {
      if (!userId || query.trim().length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const results = await searchUsers(query, userId)
        setSearchResults(results)
      } finally {
        setIsSearching(false)
      }
    },
    [userId],
  )

  const clearSearch = useCallback(() => setSearchResults([]), [])

  // ── Helper: invalidate all friend queries ─────────────────────────────────

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: friendKeys.all })
  }, [queryClient])

  // ── Mutation: send request ────────────────────────────────────────────────

  const sendRequestMutation = useMutation({
    mutationFn: (receiverId: string) => sendRequest(userId, receiverId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.outgoing(userId) })
      // Update search results locally so the badge flips immediately
      setSearchResults((prev) =>
        prev.map((r) =>
          r.relationship === 'none' ? r : r,
        ),
      )
    },
  })

  // ── Mutation: accept request ──────────────────────────────────────────────

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => acceptRequest(requestId),

    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: friendKeys.incoming(userId) })
      const previousIncoming = queryClient.getQueryData<FriendRequest[]>(
        friendKeys.incoming(userId),
      )
      // Optimistically remove from incoming list
      queryClient.setQueryData<FriendRequest[]>(friendKeys.incoming(userId), (old) =>
        old?.filter((r) => r.id !== requestId) ?? [],
      )
      return { previousIncoming }
    },

    onError: (_err, _requestId, context) => {
      if (context?.previousIncoming) {
        queryClient.setQueryData(friendKeys.incoming(userId), context.previousIncoming)
      }
    },

    onSuccess: async () => {
      // Refresh both — new friend row appears, incoming cleared
      await invalidateAll()
    },
  })

  // ── Mutation: reject request ──────────────────────────────────────────────

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectRequest(requestId),

    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: friendKeys.incoming(userId) })
      const previousIncoming = queryClient.getQueryData<FriendRequest[]>(
        friendKeys.incoming(userId),
      )
      queryClient.setQueryData<FriendRequest[]>(friendKeys.incoming(userId), (old) =>
        old?.filter((r) => r.id !== requestId) ?? [],
      )
      return { previousIncoming }
    },

    onError: (_err, _requestId, context) => {
      if (context?.previousIncoming) {
        queryClient.setQueryData(friendKeys.incoming(userId), context.previousIncoming)
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.incoming(userId) })
    },
  })

  // ── Mutation: cancel outgoing request ────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: (requestId: string) => cancelRequest(requestId),

    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: friendKeys.outgoing(userId) })
      const previousOutgoing = queryClient.getQueryData<FriendRequest[]>(
        friendKeys.outgoing(userId),
      )
      queryClient.setQueryData<FriendRequest[]>(friendKeys.outgoing(userId), (old) =>
        old?.filter((r) => r.id !== requestId) ?? [],
      )
      return { previousOutgoing }
    },

    onError: (_err, _requestId, context) => {
      if (context?.previousOutgoing) {
        queryClient.setQueryData(friendKeys.outgoing(userId), context.previousOutgoing)
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.outgoing(userId) })
    },
  })

  // ── Mutation: remove friend ───────────────────────────────────────────────

  const removeMutation = useMutation({
    mutationFn: (friendId: string) => removeFriend(userId, friendId),

    onMutate: async (friendId) => {
      await queryClient.cancelQueries({ queryKey: friendKeys.friends(userId) })
      const previousFriends = queryClient.getQueryData<Friend[]>(friendKeys.friends(userId))
      queryClient.setQueryData<Friend[]>(friendKeys.friends(userId), (old) =>
        old?.filter((f) => f.friendId !== friendId) ?? [],
      )
      return { previousFriends }
    },

    onError: (_err, _friendId, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(friendKeys.friends(userId), context.previousFriends)
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.friends(userId) })
    },
  })

  // ── Convenience: after sendRequest, update search result badge ────────────

  const sendRequestAndRefreshSearch = useCallback(
    async (receiverId: string) => {
      const result = await sendRequestMutation.mutateAsync(receiverId)
      // Flip badge in search results immediately
      setSearchResults((prev) =>
        prev.map((r) =>
          r.id === receiverId
            ? { ...r, relationship: 'pending', requestId: result.id }
            : r,
        ),
      )
      return result
    },
    [sendRequestMutation],
  )

  const isMutating =
    sendRequestMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    removeMutation.isPending

  return {
    // Data
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,

    // Loading states
    isLoading: isLoadingFriends || isLoadingIncoming || isLoadingOutgoing,
    isSearching,
    isMutating,

    // Mutations
    sendRequest: sendRequestAndRefreshSearch,
    accept: acceptMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    remove: removeMutation.mutateAsync,

    // Search
    search,
    clearSearch,

    // Manual refresh
    refresh: invalidateAll,
  }
}
