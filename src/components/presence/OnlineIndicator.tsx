import { clsx } from 'clsx'

interface OnlineIndicatorProps {
  isOnline: boolean
  /** 'sm' = 8px  (nav / avatar chip)  |  'md' = 10px (friend card) */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A small coloured dot indicating online / offline status.
 *
 * Online  → pulsing green dot
 * Offline → static grey dot
 *
 * Always rendered with role="img" and aria-label for accessibility.
 */
export function OnlineIndicator({ isOnline, size = 'md', className }: OnlineIndicatorProps) {
  const sizeClass = size === 'sm' ? 'size-2' : 'size-2.5'

  return (
    <span
      role="img"
      aria-label={isOnline ? 'Online' : 'Offline'}
      className={clsx(
        'block rounded-full border-2 border-surface-800 shrink-0',
        sizeClass,
        isOnline
          ? 'bg-brand-400 animate-pulse-glow'
          : 'bg-surface-600',
        className,
      )}
    />
  )
}
