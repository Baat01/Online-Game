/**
 * Lightweight relative-time formatter.
 * Returns a string like "2 hours ago", "just now", "3 days ago".
 * Does NOT require date-fns, keeping the bundle lean.
 */
export function formatDistanceToNow(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  const seconds = Math.floor(ms / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
