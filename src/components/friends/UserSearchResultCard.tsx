import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from './Avatar'
import { RelationshipBadge } from './RelationshipBadge'
import type { UserSearchResult } from '@/types/friends'

interface UserSearchResultCardProps {
  result: UserSearchResult
  isSending: boolean
  onSendRequest: (userId: string) => void
}

/**
 * A single row in the Discover search results.
 * Shows avatar, username, relationship badge, and an Add Friend button.
 */
export function UserSearchResultCard({
  result,
  isSending,
  onSendRequest,
}: UserSearchResultCardProps) {
  const canAdd = result.relationship === 'none'
  const displayLabel = result.display_name ?? result.username

  return (
    <div className="flex items-center gap-3 p-3 rounded-card bg-surface-800 border border-surface-700 hover:border-surface-600 transition-colors">
      <Avatar url={result.avatar_url} username={result.username} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-100 truncate">{displayLabel}</p>
          <RelationshipBadge status={result.relationship} />
        </div>
        {result.display_name && (
          <p className="text-xs text-slate-500 truncate">@{result.username}</p>
        )}
      </div>

      {canAdd && (
        <Button
          id={`add-friend-${result.id}`}
          variant="primary"
          size="sm"
          isLoading={isSending}
          onClick={() => onSendRequest(result.id)}
          leftIcon={<UserPlus className="size-3.5" aria-hidden="true" />}
          aria-label={`Send friend request to ${result.username}`}
          className="shrink-0"
        >
          <span className="hidden sm:inline">Add</span>
        </Button>
      )}
    </div>
  )
}
