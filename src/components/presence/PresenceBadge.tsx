import { OnlineIndicator } from './OnlineIndicator'
import { LastSeenLabel } from './LastSeenLabel'

interface PresenceBadgeProps {
  isOnline: boolean
  lastSeen: string | null
  /** Layout direction for the badge */
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * PresenceBadge — combines OnlineIndicator + LastSeenLabel.
 *
 * Horizontal (default): dot + text inline — used in friend card footers.
 * Vertical: dot above text — used in sidebars.
 */
export function PresenceBadge({
  isOnline,
  lastSeen,
  orientation = 'horizontal',
  className,
}: PresenceBadgeProps) {
  const isHorizontal = orientation === 'horizontal'

  return (
    <div
      className={`flex ${isHorizontal ? 'flex-row items-center gap-1.5' : 'flex-col items-start gap-1'} ${className ?? ''}`}
    >
      <OnlineIndicator isOnline={isOnline} size="sm" />
      <LastSeenLabel isOnline={isOnline} lastSeen={lastSeen} />
    </div>
  )
}
