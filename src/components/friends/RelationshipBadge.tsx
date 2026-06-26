import type { RelationshipStatus } from '@/types/friends'
import { clsx } from 'clsx'

interface RelationshipBadgeProps {
  status: RelationshipStatus
}

const config: Record<RelationshipStatus, { label: string; classes: string } | null> = {
  self: { label: 'You', classes: 'bg-surface-600 text-slate-400 border-surface-500' },
  friend: { label: 'Friend', classes: 'bg-brand-500/15 text-brand-300 border-brand-500/30' },
  pending: {
    label: 'Pending',
    classes: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
  },
  requested: {
    label: 'Requested',
    classes: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  none: null,
}

/**
 * Small badge showing the relationship status between the current user and another user.
 * Returns null when status is 'none'.
 */
export function RelationshipBadge({ status }: RelationshipBadgeProps) {
  const cfg = config[status]
  if (!cfg) return null

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        cfg.classes,
      )}
    >
      {cfg.label}
    </span>
  )
}
