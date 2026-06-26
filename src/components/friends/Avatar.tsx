import { UserCircle2 } from 'lucide-react'

interface AvatarProps {
  url: string | null
  username: string
  size?: 'sm' | 'md'
}

/**
 * Small avatar circle used throughout the friends UI.
 * Falls back to a username initial if no avatar is set.
 */
export function Avatar({ url, username, size = 'md' }: AvatarProps) {
  const sizeClasses = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className={`${sizeClasses} rounded-full object-cover border border-surface-600 shrink-0`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses} rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold shrink-0`}
    >
      {username ? username[0].toUpperCase() : <UserCircle2 className="size-4" />}
    </div>
  )
}
