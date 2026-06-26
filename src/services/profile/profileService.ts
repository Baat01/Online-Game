import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { Profile } from '@/types/auth'
import type { UpdateProfilePayload } from '@/types/profile'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * Typed helper for profile UPDATE operations.
 * Supabase's query builder can infer 'never' for update() when the hand-crafted
 * Database type doesn't perfectly align with its internal chain types.
 * This helper casts the from() result to bypass that while keeping type safety
 * through the ProfileUpdate type on the payload.
 */
function updateProfiles(payload: ProfileUpdate) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('profiles').update(payload)
}

/**
 * Profile Service — all Supabase profile/storage calls.
 *
 * Rules:
 * - No React, no hooks, no UI
 * - Throws on error so callers (hooks) can handle UX
 * - Returns typed domain objects
 */

const AVATAR_BUCKET = 'avatars'

// ─────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────

/**
 * Fetch a user profile by userId.
 * Returns null if not found (PGRST116).
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as Profile
}

// ─────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────

/**
 * Update editable profile fields for the authenticated user.
 */
export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  const { data, error } = await updateProfiles({
    username: payload.username,
    display_name: payload.display_name,
    bio: payload.bio,
    updated_at: new Date().toISOString(),
  })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

// ─────────────────────────────────────────────
// Username availability
// ─────────────────────────────────────────────

/**
 * Returns true if the username is not taken by another user.
 * currentUserId is excluded so the owner can keep their own username.
 */
export async function isUsernameAvailable(
  username: string,
  currentUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .neq('id', currentUserId)
    .maybeSingle()

  if (error) throw error
  return data === null
}

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────

/**
 * Convert a File to WebP using the browser Canvas API.
 * Returns a Blob in image/webp format at 0.85 quality.
 */
async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      try {
        // Cap at 400x400 to keep file sizes small
        const MAX = 400
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas context unavailable')

        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas toBlob returned null'))
          },
          'image/webp',
          0.85,
        )
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for conversion'))
    }

    img.src = objectUrl
  })
}

/**
 * Upload an avatar for a user.
 * Converts the image to WebP, uploads to avatars/{userId}/avatar.webp,
 * updates the profile avatar_url, and returns the public URL.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const webpBlob = await convertToWebP(file)
  const filePath = `${userId}/avatar.webp`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, webpBlob, {
      contentType: 'image/webp',
      upsert: true, // overwrite previous avatar
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}` // bust cache

  // Persist to profile row
  const { error: updateError } = await updateProfiles({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) throw updateError

  return publicUrl
}

/**
 * Remove the current user's avatar.
 * Deletes the storage file and clears avatar_url on the profile.
 */
export async function removeAvatar(userId: string): Promise<void> {
  const filePath = `${userId}/avatar.webp`

  // Delete from storage (ignore "not found" errors)
  const { error: deleteError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([filePath])

  if (deleteError && deleteError.message !== 'Object not found') {
    throw deleteError
  }

  // Clear avatar_url on profile
  const { error: updateError } = await updateProfiles({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) throw updateError
}
