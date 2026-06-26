import { supabase } from '@/lib/supabase'
import type { Friend, FriendRequest, RelationshipStatus, UserSearchResult } from '@/types/friends'
import { userIdSchema, requestIdSchema, searchQuerySchema } from './friendsSchemas'

/**
 * Friends Service — all Supabase friend/social calls.
 *
 * Rules:
 * - No React, no hooks, no UI
 * - Throws on error so callers (hooks) can handle UX
 * - Returns typed domain objects, not raw Supabase responses
 * - Validates inputs with Zod before hitting the DB
 */

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Profile fields we select for friend/request cards */
const PROFILE_SELECT = 'id, username, display_name, avatar_url' as const

/** Map a raw DB row → FriendRequest domain object */
function toFriendRequest(
  row: Record<string, unknown>,
  direction: 'incoming' | 'outgoing',
): FriendRequest {
  return {
    id: row.id as string,
    senderId: row.sender_id as string,
    receiverId: row.receiver_id as string,
    status: row.status as FriendRequest['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    sender:
      direction === 'incoming'
        ? (row.sender_profile as FriendRequest['sender'])
        : undefined,
    receiver:
      direction === 'outgoing'
        ? (row.receiver_profile as FriendRequest['receiver'])
        : undefined,
  }
}

/** Map a raw DB row → Friend domain object */
function toFriend(row: Record<string, unknown>): Friend {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    friendId: row.friend_id as string,
    createdAt: row.created_at as string,
    profile: row.friend_profile as Friend['profile'],
  }
}

// ─────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────

/**
 * Fetch all accepted friends for the current user.
 * Returns the friend's profile via join.
 */
export async function getFriends(currentUserId: string): Promise<Friend[]> {
  userIdSchema.parse(currentUserId)

  const { data, error } = await supabase
    .from('friends')
    .select(`id, user_id, friend_id, created_at, friend_profile:profiles!friends_friend_id_fkey(${PROFILE_SELECT})`)
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(toFriend)
}

/**
 * Fetch all pending incoming friend requests for the current user.
 */
export async function getIncomingRequests(currentUserId: string): Promise<FriendRequest[]> {
  userIdSchema.parse(currentUserId)

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`id, sender_id, receiver_id, status, created_at, updated_at, sender_profile:profiles!friend_requests_sender_id_fkey(${PROFILE_SELECT})`)
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => toFriendRequest(row, 'incoming'))
}

/**
 * Fetch all pending outgoing friend requests sent by the current user.
 */
export async function getOutgoingRequests(currentUserId: string): Promise<FriendRequest[]> {
  userIdSchema.parse(currentUserId)

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`id, sender_id, receiver_id, status, created_at, updated_at, receiver_profile:profiles!friend_requests_receiver_id_fkey(${PROFILE_SELECT})`)
    .eq('sender_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => toFriendRequest(row, 'outgoing'))
}

/**
 * Compute the relationship status between the current user and another user.
 * Used to drive UI badges and action availability.
 */
export async function getRelationshipStatus(
  currentUserId: string,
  targetUserId: string,
): Promise<{ status: RelationshipStatus; requestId?: string }> {
  if (currentUserId === targetUserId) return { status: 'self' }

  // Check friendship (only one direction needed — we store both)
  const { data: friendship } = await supabase
    .from('friends')
    .select('id')
    .eq('user_id', currentUserId)
    .eq('friend_id', targetUserId)
    .maybeSingle()

  if (friendship) return { status: 'friend' }

  // Check outgoing pending request
  const { data: outgoing } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', currentUserId)
    .eq('receiver_id', targetUserId)
    .eq('status', 'pending')
    .maybeSingle()

  if (outgoing) return { status: 'pending', requestId: outgoing.id }

  // Check incoming pending request
  const { data: incoming } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', targetUserId)
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending')
    .maybeSingle()

  if (incoming) return { status: 'requested', requestId: incoming.id }

  return { status: 'none' }
}

/**
 * Search users by username prefix (case-insensitive).
 * Enriches each result with the current relationship status.
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<UserSearchResult[]> {
  const cleanQuery = searchQuerySchema.parse(query)

  const { data, error } = await supabase
    .from('profiles')
    .select(`id, username, display_name, avatar_url`)
    .ilike('username', `%${cleanQuery}%`)
    .neq('id', currentUserId)
    .order('username')
    .limit(20)

  if (error) throw error

  // Enrich each result with relationship status
  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any[]).map(async (profile) => {
      const rel = await getRelationshipStatus(currentUserId, profile.id)
      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        relationship: rel.status,
        requestId: rel.requestId,
      } satisfies UserSearchResult
    }),
  )

  return enriched
}

// ─────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────

/**
 * Send a friend request from the current user to receiverId.
 */
export async function sendRequest(
  currentUserId: string,
  receiverId: string,
): Promise<FriendRequest> {
  userIdSchema.parse(currentUserId)
  userIdSchema.parse(receiverId)

  if (currentUserId === receiverId) throw new Error('Cannot send a friend request to yourself')

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: currentUserId, receiver_id: receiverId })
    .select(`id, sender_id, receiver_id, status, created_at, updated_at`)
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('A request already exists with this user.')
    throw error
  }

  return {
    id: (data as Record<string, unknown>).id as string,
    senderId: currentUserId,
    receiverId,
    status: 'pending',
    createdAt: (data as Record<string, unknown>).created_at as string,
    updatedAt: (data as Record<string, unknown>).updated_at as string,
  }
}

/**
 * Accept an incoming friend request.
 * The DB trigger will create both symmetric friend rows.
 */
export async function acceptRequest(requestId: string): Promise<void> {
  requestIdSchema.parse(requestId)

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) throw error
}

/**
 * Reject an incoming friend request.
 */
export async function rejectRequest(requestId: string): Promise<void> {
  requestIdSchema.parse(requestId)

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) throw error
}

/**
 * Cancel an outgoing friend request (soft-cancel via status update).
 */
export async function cancelRequest(requestId: string): Promise<void> {
  requestIdSchema.parse(requestId)

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) throw error
}

/**
 * Remove a friend (deletes the current user's row; DB trigger removes the reverse).
 */
export async function removeFriend(
  currentUserId: string,
  friendId: string,
): Promise<void> {
  userIdSchema.parse(currentUserId)
  userIdSchema.parse(friendId)

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', currentUserId)
    .eq('friend_id', friendId)

  if (error) throw error
}
