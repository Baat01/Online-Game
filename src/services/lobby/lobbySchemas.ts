import { z } from 'zod'

/**
 * Zod validation schemas for all lobby input parameters.
 */

export const createRoomSchema = z.object({
  gameSlug: z.string().min(1, 'Game slug is required'),
  maxPlayers: z.number().int().min(2).max(10).default(6),
})

export const inviteFriendSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  receiverId: z.string().uuid('Invalid user ID'),
  gameSlug: z.string().min(1, 'Game slug is required'),
})

export const kickPlayerSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type InviteFriendInput = z.infer<typeof inviteFriendSchema>
