import { z } from 'zod'

/**
 * Zod validation schemas for the profile system.
 * All validation rules live here — not in components.
 */

// ─────────────────────────────────────────────
// Profile form schema
// ─────────────────────────────────────────────

export const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(
      /^[a-z0-9_]+$/,
      'Username can only contain lowercase letters, numbers, and underscores',
    ),

  display_name: z
    .string()
    .max(40, 'Display name cannot exceed 40 characters')
    .default(''),

  bio: z
    .string()
    .max(250, 'Bio cannot exceed 250 characters')
    .default(''),
})

export type ProfileFormSchema = z.infer<typeof profileFormSchema>

// ─────────────────────────────────────────────
// Avatar file validation (not a Zod schema — validates a File object)
// ─────────────────────────────────────────────

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_SIZE_BYTES = 3 * 1024 * 1024 // 3 MB

export interface AvatarValidationError {
  type: 'size' | 'mime'
  message: string
}

/**
 * Validates a File before uploading as an avatar.
 * Returns null on success, or an error object.
 */
export function validateAvatarFile(file: File): AvatarValidationError | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return {
      type: 'mime',
      message: 'Only JPEG, PNG, and WebP images are accepted.',
    }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      type: 'size',
      message: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 3 MB.`,
    }
  }
  return null
}
