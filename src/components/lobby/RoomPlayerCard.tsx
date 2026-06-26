import { ShieldCheck, UserMinus } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/friends/Avatar'
import { OnlineIndicator } from '@/components/presence/OnlineIndicator'
import type { RoomPlayer } from '@/types/lobby'

interface RoomPlayerCardProps {
  player: RoomPlayer
  isHost: boolean
  isCurrentUser: boolean
  isOnline?: boolean
  /** Whether the current viewer is the room host (controls kick visibility) */
  viewerIsHost: boolean
  isKicking?: boolean
  onKick?: (userId: string) => void
}

/**
 * Card for a single player in the game room lobby.
 * Shows avatar, name, host crown, ready badge, and (for host) a kick button.
 */
export function RoomPlayerCard({
  player,
  isHost,
  isCurrentUser,
  isOnline = false,
  viewerIsHost,
  isKicking = false,
  onKick,
}: RoomPlayerCardProps) {
  const { profile, ready } = player
  const displayLabel = profile.display_name ?? profile.username

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-card border transition-colors',
        ready
          ? 'bg-brand-500/5 border-brand-500/30'
          : 'bg-surface-800 border-surface-700',
      )}
    >
      {/* Avatar + presence dot */}
      <div className="relative shrink-0">
        <Avatar url={profile.avatar_url} username={profile.username} />
        <span className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator isOnline={isOnline} size="sm" />
        </span>
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-slate-100 truncate">{displayLabel}</p>
          {isCurrentUser && (
            <span className="text-xs text-slate-500">(You)</span>
          )}
          {isHost && (
            <span
              role="img"
              aria-label="Room host"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-gold-500/15 text-gold-400 border border-gold-500/25"
            >
              <ShieldCheck className="size-3" aria-hidden="true" />
              Host
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
      </div>

      {/* Ready badge */}
      <span
        className={clsx(
          'shrink-0 text-xs font-semibold px-2 py-1 rounded-btn',
          ready
            ? 'bg-brand-500/20 text-brand-400'
            : 'bg-surface-700 text-slate-500',
        )}
      >
        {ready ? 'Ready' : 'Waiting'}
      </span>

      {/* Kick button — host only, not self */}
      {viewerIsHost && !isCurrentUser && (
        <Button
          id={`kick-${player.userId}`}
          variant="ghost"
          size="sm"
          isLoading={isKicking}
          onClick={() => onKick?.(player.userId)}
          leftIcon={<UserMinus className="size-3.5" aria-hidden="true" />}
          aria-label={`Kick ${profile.username}`}
          className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <span className="hidden sm:inline">Kick</span>
        </Button>
      )}
    </div>
  )
}
