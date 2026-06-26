import type { Profile } from '@/types/auth'

/**
 * Profile-specific types.
 * Separate from auth.ts to keep each module focused.
 */

/** Payload accepted by profileService.updateProfile() */
export interface UpdateProfilePayload {
  username: string
  display_name: string | null
  bio: string | null
}

/** Values managed by the profile edit form (react-hook-form) */
export interface ProfileFormValues {
  username: string
  display_name: string
  bio: string
}

/**
 * A client-side validated avatar file before upload.
 * Holds the original File and a blob URL for preview rendering.
 */
export interface AvatarFile {
  file: File
  /** Object URL created via URL.createObjectURL() — revoke after use */
  previewUrl: string
  sizeBytes: number
}

/** Converts a Profile to the initial values for the edit form */
export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    username: profile.username,
    display_name: profile.display_name ?? '',
    bio: profile.bio ?? '',
  }
}

/** Converts form values back to the service payload */
export function formValuesToPayload(values: ProfileFormValues): UpdateProfilePayload {
  return {
    username: values.username.trim().toLowerCase(),
    display_name: values.display_name.trim() || null,
    bio: values.bio.trim() || null,
  }
}
