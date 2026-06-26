import { z } from 'zod'

/**
 * Zod schemas for friends service input validation.
 */

/** userId must be a valid UUID */
export const userIdSchema = z.string().uuid('Invalid user ID')

/** requestId must be a valid UUID */
export const requestIdSchema = z.string().uuid('Invalid request ID')

/** Search query: 2–50 chars, trimmed */
export const searchQuerySchema = z
  .string()
  .min(2, 'Query must be at least 2 characters')
  .max(50, 'Query too long')
  .transform((v) => v.trim())
