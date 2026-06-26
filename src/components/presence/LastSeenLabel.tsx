/**
 * Lightweight relative-time formatter for LastSeenLabel.
 * No external dependency — keeps the bundle lean.
 */
function formatLastSeen(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  const seconds = Math.floor(ms / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (hours < 48) return 'Yesterday'
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

interface LastSeenLabelProps {
  isOnline: boolean
  lastSeen: string | null
  className?: string
}

/**
 * Renders "Online now" for online users, or "Last seen X ago" for offline users.
 * Returns null if no lastSeen date is available.
 */
export function LastSeenLabel({ isOnline, lastSeen, className }: LastSeenLabelProps) {
  if (isOnline) {
    return (
      <span className={`text-xs text-brand-400 ${className ?? ''}`} aria-live="polite">
        Online now
      </span>
    )
  }

  if (!lastSeen) return null

  return (
    <span
      className={`text-xs text-slate-600 ${className ?? ''}`}
      title={new Date(lastSeen).toLocaleString()}
    >
      Last seen {formatLastSeen(lastSeen)}
    </span>
  )
}
