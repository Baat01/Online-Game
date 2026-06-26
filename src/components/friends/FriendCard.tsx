import { UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from './Avatar'
import { OnlineIndicator } from '@/components/presence/OnlineIndicator'
import { LastSeenLabel } from '@/components/presence/LastSeenLabel'
import type { Friend } from '@/types/friends'

interface FriendCardProps {
  friend: Friend
  isRemoving: boolean
  onRemove: (friendId: string) => void
  /** Phase 2.4 — presence props (optional for backward compat) */
  isOnline?: boolean
  lastSeen?: string | null
}

/**
 * Card displaying a single friend with presence indicator and remove action.
 */
export function FriendCard({
  friend,
  isRemoving,
  onRemove,
  isOnline = false,
  lastSeen = null,
}: FriendCardProps) {
  const { profile } = friend
  const displayLabel = profile.display_name ?? profile.username

  return (
    <div className="flex items-center gap-3 p-3 rounded-card bg-surface-800 border border-surface-700 transition-colors hover:border-surface-600">
      {/* Avatar with presence dot overlay */}
      <div className="relative shrink-0">
        <Avatar url={profile.avatar_url} username={profile.username} />
        <span className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator isOnline={isOnline} size="sm" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{displayLabel}</p>
        {profile.display_name && (
          <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
        )}
        <LastSeenLabel isOnline={isOnline} lastSeen={lastSeen} />
      </div>

      <Button
        id={`remove-friend-${friend.friendId}`}
        variant="ghost"
        size="sm"
        isLoading={isRemoving}
        onClick={() => onRemove(friend.friendId)}
        leftIcon={<UserMinus className="size-3.5" aria-hidden="true" />}
        aria-label={`Remove ${profile.username} from friends`}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
      >
        <span className="hidden sm:inline">Remove</span>
      </Button>
    </div>
  )
}
