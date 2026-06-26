import { useEffect, useCallback, useId } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/auth/FormField'
import { CharacterCounter } from '@/components/profile/CharacterCounter'
import { profileFormSchema, type ProfileFormSchema } from '@/services/profile/profileSchemas'
import type { Profile } from '@/types/auth'
import { profileToFormValues, formValuesToPayload } from '@/types/profile'
import type { UpdateProfilePayload } from '@/types/profile'

interface ProfileFormProps {
  profile: Profile
  isSaving: boolean
  onSave: (payload: UpdateProfilePayload) => Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
  checkUsernameAvailable: (username: string) => Promise<boolean>
}

/**
 * Profile edit form.
 *
 * Features:
 * - react-hook-form + Zod validation
 * - Async username uniqueness check (debounced)
 * - CharacterCounter on display_name and bio
 * - Dirty-state tracking (enables/disables Save button)
 * - Loading skeleton fallback handled by parent
 */
export function ProfileForm({
  profile,
  isSaving,
  onSave,
  onDirtyChange,
  checkUsernameAvailable,
}: ProfileFormProps) {
  const bioId = useId()
  const defaultValues = profileToFormValues(profile)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProfileFormSchema, any, ProfileFormSchema>({
    // Cast needed because zodResolver infers the Zod input type (with optionals)
    // but we want the output type (with defaults applied) for TFieldValues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues,
  })

  const bioValue = watch('bio') ?? ''
  const displayNameValue = watch('display_name') ?? ''

  // Notify parent of dirty state for navigation blocker
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // ── Username async validation ────────────────────────────────────────────

  const validateUsername = useCallback(
    async (username: string): Promise<boolean> => {
      // Skip check if unchanged
      if (username === profile.username) return true
      try {
        const available = await checkUsernameAvailable(username)
        if (!available) {
          setError('username', { message: 'This username is already taken.' })
        }
        return available
      } catch {
        return true // network error — don't block save
      }
    },
    [profile.username, checkUsernameAvailable, setError],
  )

  // ── Submit ───────────────────────────────────────────────────────────────

  const onSubmit: SubmitHandler<ProfileFormSchema> = async (values) => {
    const usernameOk = await validateUsername(values.username)
    if (!usernameOk) return

    const payload = formValuesToPayload(values)
    await onSave(payload)
    reset(values) // mark as clean after successful save
  }

  const handleCancel = () => reset(defaultValues)

  const isBusy = isSubmitting || isSaving

  return (
    <form
      id="profile-form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Username */}
      <FormField
        id="profile-username"
        label="Username"
        type="text"
        autoComplete="username"
        placeholder="ace_player"
        error={errors.username}
        hint="Lowercase letters, numbers, underscores · 3–20 characters"
        {...register('username')}
      />

      {/* Display name */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="profile-display-name" className="text-sm font-medium text-slate-300">
            Display name
            <span className="text-slate-500 font-normal"> (optional)</span>
          </label>
          <CharacterCounter current={displayNameValue.length} max={40} />
        </div>
        <FormField
          id="profile-display-name"
          label="Display name"
          type="text"
          autoComplete="name"
          placeholder="Ace Player"
          error={errors.display_name}
          {...register('display_name')}
        />
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={bioId} className="text-sm font-medium text-slate-300">
            Bio
            <span className="text-slate-500 font-normal"> (optional)</span>
          </label>
          <CharacterCounter current={bioValue.length} max={250} />
        </div>
        <textarea
          id={bioId}
          rows={3}
          placeholder="Tell people a bit about yourself…"
          aria-invalid={!!errors.bio}
          aria-describedby={errors.bio ? `${bioId}-error` : undefined}
          className={clsx(
            'w-full rounded-btn bg-surface-700 border px-3 py-2',
            'text-sm text-slate-100 placeholder:text-slate-500',
            'transition-colors duration-150 resize-none',
            'focus:outline-none focus:ring-1',
            errors.bio
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-surface-600 focus:border-brand-500 focus:ring-brand-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          {...register('bio')}
        />
        {errors.bio && (
          <p id={`${bioId}-error`} role="alert" className="text-xs text-red-400">
            {errors.bio.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-surface-700">
        <Button
          id="profile-save"
          type="submit"
          isLoading={isBusy}
          disabled={!isDirty || isBusy}
          leftIcon={isBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        >
          {isBusy ? 'Saving…' : 'Save changes'}
        </Button>

        <Button
          id="profile-cancel"
          type="button"
          variant="ghost"
          disabled={!isDirty || isBusy}
          leftIcon={<X className="size-4" />}
          onClick={handleCancel}
        >
          Cancel
        </Button>

        {isDirty && (
          <span className="text-xs text-slate-500 ml-auto">Unsaved changes</span>
        )}
      </div>
    </form>
  )
}
