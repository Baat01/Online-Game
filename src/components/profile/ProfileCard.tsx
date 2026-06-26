import { clsx } from 'clsx'
import type { Profile } from '@/types/auth'

type AvatarSize = 'sm' | 'md' | 'lg'

interface ProfileCardProps {
  profile: Profile
  size?: AvatarSize
  /** When true, shows bio and display name below username */
  showDetails?: boolean
  className?: string
}

const avatarSizes: Record<AvatarSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-14',
}

const textSizes: Record<AvatarSize, { name: string; sub: string }> = {
  sm: { name: 'text-sm font-medium', sub: 'text-xs' },
  md: { name: 'text-base font-semibold', sub: 'text-sm' },
  lg: { name: 'text-lg font-bold', sub: 'text-sm' },
}

/**
 * ProfileCard — reusable read-only profile display.
 * Used in friend lists, game lobbies, and the profile page header.
 */
export function ProfileCard({ profile, size = 'md', showDetails = false, className }: ProfileCardProps) {
  const initials = profile.username.slice(0, 2).toUpperCase()
  const { name: nameClass, sub: subClass } = textSizes[size]

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      {/* Avatar */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={`${profile.username}'s avatar`}
          className={clsx(avatarSizes[size], 'rounded-full object-cover shrink-0 ring-2 ring-surface-600')}
        />
      ) : (
        <div
          aria-hidden="true"
          className={clsx(
            avatarSizes[size],
            'rounded-full bg-brand-500/20 flex items-center justify-center shrink-0',
            'ring-2 ring-surface-600',
          )}
        >
          <span className={clsx('font-bold text-brand-400', size === 'sm' ? 'text-xs' : 'text-sm')}>
            {initials}
          </span>
        </div>
      )}

      {/* Text */}
      <div className="min-w-0">
        {/* Display name or username */}
        <p className={clsx(nameClass, 'text-slate-100 truncate')}>
          {profile.display_name ?? profile.username}
        </p>

        {/* @username (shown when display_name exists) */}
        {profile.display_name && (
          <p className={clsx(subClass, 'text-slate-500 truncate')}>@{profile.username}</p>
        )}

        {/* Online indicator */}
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className={clsx(
              'size-1.5 rounded-full',
              profile.is_online ? 'bg-brand-400' : 'bg-slate-600',
            )}
            aria-hidden="true"
          />
          <span className={clsx('text-xs', profile.is_online ? 'text-brand-400' : 'text-slate-500')}>
            {profile.is_online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Bio (only when showDetails=true) */}
        {showDetails && profile.bio && (
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{profile.bio}</p>
        )}
      </div>
    </div>
  )
}
