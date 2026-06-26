import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  getProfile,
  isUsernameAvailable,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from '@/services/profile/profileService'
import type { Profile } from '@/types/auth'
import type { UpdateProfilePayload } from '@/types/profile'

/**
 * React Query key factory for profile queries.
 * Always call with the userId so each user has an independent cache entry.
 */
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => ['profile', userId] as const,
}

/**
 * Primary profile hook.
 *
 * Manages loading, saving, and avatar mutations with:
 * - Automatic cache invalidation after mutations
 * - Optimistic updates (instant UI) with rollback on failure
 * - AuthContext nav chip sync via refreshProfile()
 *
 * Usage:
 *   const { profile, isLoading, updateProfile, uploadAvatar } = useProfile()
 */
export function useProfile() {
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  // ── Load ──────────────────────────────────────────────────────────────────

  const {
    data: profile,
    isLoading,
    refetch: refresh,
  } = useQuery({
    queryKey: user ? profileKeys.detail(user.id) : profileKeys.all,
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // ── Update profile fields ─────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => {
      if (!user) throw new Error('Not authenticated')
      return updateProfile(user.id, payload)
    },

    /** Optimistic update: immediately apply changes to the cached profile */
    onMutate: async (payload) => {
      if (!user) return

      await queryClient.cancelQueries({ queryKey: profileKeys.detail(user.id) })

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<Profile>(profileKeys.detail(user.id))

      // Optimistically update cache
      queryClient.setQueryData<Profile>(profileKeys.detail(user.id), (old) =>
        old
          ? {
              ...old,
              username: payload.username,
              display_name: payload.display_name,
              bio: payload.bio,
            }
          : old,
      )

      return { previous }
    },

    onError: (_err, _payload, context) => {
      // Rollback to snapshot
      if (context?.previous && user) {
        queryClient.setQueryData(profileKeys.detail(user.id), context.previous)
      }
    },

    onSuccess: async () => {
      if (user) {
        await queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) })
        await refreshProfile() // sync nav chip
      }
    },
  })

  // ── Upload avatar ─────────────────────────────────────────────────────────

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error('Not authenticated')
      return uploadAvatar(user.id, file)
    },

    onMutate: async () => {
      if (!user) return
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(user.id) })
      const previous = queryClient.getQueryData<Profile>(profileKeys.detail(user.id))
      return { previous }
    },

    onError: (_err, _file, context) => {
      if (context?.previous && user) {
        queryClient.setQueryData(profileKeys.detail(user.id), context.previous)
      }
    },

    onSuccess: async (newUrl) => {
      if (user) {
        queryClient.setQueryData<Profile>(profileKeys.detail(user.id), (old) =>
          old ? { ...old, avatar_url: newUrl } : old,
        )
        await refreshProfile()
      }
    },
  })

  // ── Remove avatar ─────────────────────────────────────────────────────────

  const removeAvatarMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('Not authenticated')
      return removeAvatar(user.id)
    },

    onMutate: async () => {
      if (!user) return
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(user.id) })
      const previous = queryClient.getQueryData<Profile>(profileKeys.detail(user.id))

      // Optimistically clear avatar
      queryClient.setQueryData<Profile>(profileKeys.detail(user.id), (old) =>
        old ? { ...old, avatar_url: null } : old,
      )
      return { previous }
    },

    onError: (_err, _v, context) => {
      if (context?.previous && user) {
        queryClient.setQueryData(profileKeys.detail(user.id), context.previous)
      }
    },

    onSuccess: async () => {
      if (user) {
        await queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) })
        await refreshProfile()
      }
    },
  })

  // ── Username availability (standalone async check for the form) ───────────

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!user) return false
    return isUsernameAvailable(username, user.id)
  }

  return {
    profile: profile ?? null,
    isLoading,
    isSaving: updateMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    isRemovingAvatar: removeAvatarMutation.isPending,

    updateProfile: updateMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    removeAvatar: removeAvatarMutation.mutateAsync,
    checkUsernameAvailable,
    refresh,
  }
}
