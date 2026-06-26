import { useState, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import { UserCircle2 } from 'lucide-react'
import { AvatarUploader } from '@/components/profile/AvatarUploader'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/components/ui/Toast'
import type { UpdateProfilePayload } from '@/types/profile'

/**
 * Profile page — /profile (protected).
 *
 * Sections:
 * 1. Avatar uploader
 * 2. Profile edit form (username, display_name, bio)
 *
 * Behaviour:
 * - Warns on navigation when form has unsaved changes (useBlocker)
 * - Toast on save success / failure
 * - Optimistic updates via useProfile
 */
export function ProfilePage() {
  const { profile, isLoading, isSaving, isUploadingAvatar, isRemovingAvatar,
    updateProfile, uploadAvatar, removeAvatar, checkUsernameAvailable } = useProfile()
  const { toast } = useToast()
  const [isDirty, setIsDirty] = useState(false)

  // ── Navigation blocker (unsaved changes guard) ───────────────────────────
  useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = async (payload: UpdateProfilePayload) => {
    try {
      await updateProfile(payload)
      toast('Profile saved successfully!', 'success')
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to save profile. Please try again.',
        'error',
      )
      // Do not re-throw — form stays dirty because reset() is only called on success
    }
  }

  const handleUploadAvatar = async (file: File) => {
    try {
      await uploadAvatar(file)
      toast('Avatar updated!', 'success')
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to upload avatar.',
        'error',
      )
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar()
      toast('Avatar removed.', 'info')
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to remove avatar.',
        'error',
      )
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        <ProfilePageSkeleton />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-slate-400">
        <UserCircle2 className="size-12 opacity-30" />
        <p>Profile not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Your Profile</h1>

      <div className="flex flex-col gap-6">
        {/* ── Avatar Card ── */}
        <Card>
          <Card.Body className="flex flex-col items-center py-8">
            <AvatarUploader
              currentUrl={profile.avatar_url}
              username={profile.username}
              isUploading={isUploadingAvatar}
              isRemoving={isRemovingAvatar}
              onUpload={handleUploadAvatar}
              onRemove={handleRemoveAvatar}
            />
          </Card.Body>
        </Card>

        {/* ── Info Card ── */}
        <Card>
          <Card.Header>
            <h2 className="text-base font-semibold text-slate-100">Account Details</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Update your username, display name, and bio.
            </p>
          </Card.Header>
          <Card.Body>
            {isSaving && (
              <div className="flex items-center gap-2 mb-4 text-sm text-brand-400">
                <Spinner size="sm" />
                Saving…
              </div>
            )}
            <ProfileForm
              profile={profile}
              isSaving={isSaving}
              onSave={handleSave}
              onDirtyChange={setIsDirty}
              checkUsernameAvailable={checkUsernameAvailable}
            />
          </Card.Body>
        </Card>

        {/* ── Account info (read-only) ── */}
        <Card>
          <Card.Body className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-slate-300 mb-1">Account</h2>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Member since</span>
              <span className="text-slate-200">
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`rounded bg-surface-700 animate-pulse ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}

function ProfilePageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Body className="flex flex-col items-center py-8 gap-4">
          <SkeletonBox className="size-[120px] sm:size-[160px] rounded-full" />
          <SkeletonBox className="h-8 w-40" />
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>
          <SkeletonBox className="h-5 w-32" />
        </Card.Header>
        <Card.Body className="flex flex-col gap-4">
          <SkeletonBox className="h-10" />
          <SkeletonBox className="h-10" />
          <SkeletonBox className="h-20" />
          <SkeletonBox className="h-10 w-32" />
        </Card.Body>
      </Card>
    </div>
  )
}
