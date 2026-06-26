/**
 * Friend-system domain types.
 * Decoupled from database.ts to keep modules focused.
 */

import type { Profile } from '@/types/auth'

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

/**
 * Computed relationship status between the current user and another user.
 * Used to drive badges and action buttons in the Discover tab.
 */
export type RelationshipStatus =
  | 'self'       // the other user IS the current user
  | 'friend'     // already friends
  | 'pending'    // current user sent a request (awaiting acceptance)
  | 'requested'  // other user sent a request to the current user
  | 'none'       // no relationship

// ─────────────────────────────────────────────
// Domain objects
// ─────────────────────────────────────────────

/** A friend request row enriched with the sender/receiver profile */
export interface FriendRequest {
  id: string
  senderId: string
  receiverId: string
  status: FriendRequestStatus
  createdAt: string
  updatedAt: string
  /** Populated when loading incoming requests (the person who sent it) */
  sender?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  /** Populated when loading outgoing requests (the person receiving it) */
  receiver?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

/** A materialised friendship row (always points to the friend profile) */
export interface Friend {
  id: string
  userId: string
  friendId: string
  createdAt: string
  /** Always populated from the join on profiles */
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

/** A user returned from the search endpoint, with relationship status attached */
export interface UserSearchResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  relationship: RelationshipStatus
  /** If pending/requested, the request id for quick action */
  requestId?: string
}
