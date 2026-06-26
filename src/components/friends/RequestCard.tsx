import { Check, X } from 'lucide-react'
import { formatDistanceToNow } from '../friends/formatDistanceToNow'
import { Button } from '@/components/ui/Button'
import { Avatar } from './Avatar'
import type { FriendRequest } from '@/types/friends'

// ─────────────────────────────────────────────
// Incoming request card (accept / reject)
// ─────────────────────────────────────────────

interface IncomingRequestCardProps {
  request: FriendRequest
  isAccepting: boolean
  isRejecting: boolean
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
}

export function IncomingRequestCard({
  request,
  isAccepting,
  isRejecting,
  onAccept,
  onReject,
}: IncomingRequestCardProps) {
  const profile = request.sender!
  const isBusy = isAccepting || isRejecting

  return (
    <div className="flex items-center gap-3 p-3 rounded-card bg-surface-800 border border-surface-700 hover:border-surface-600 transition-colors">
      <Avatar url={profile.avatar_url} username={profile.username} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">
          {profile.display_name ?? profile.username}
        </p>
        {profile.display_name && (
          <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
        )}
        <p className="text-xs text-slate-600 mt-0.5">
          {formatDistanceToNow(request.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          id={`accept-request-${request.id}`}
          variant="primary"
          size="sm"
          isLoading={isAccepting}
          disabled={isBusy}
          onClick={() => onAccept(request.id)}
          leftIcon={<Check className="size-3.5" aria-hidden="true" />}
          aria-label={`Accept friend request from ${profile.username}`}
        >
          <span className="hidden sm:inline">Accept</span>
        </Button>

        <Button
          id={`reject-request-${request.id}`}
          variant="ghost"
          size="sm"
          isLoading={isRejecting}
          disabled={isBusy}
          onClick={() => onReject(request.id)}
          leftIcon={<X className="size-3.5" aria-hidden="true" />}
          aria-label={`Reject friend request from ${profile.username}`}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <span className="hidden sm:inline">Reject</span>
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Outgoing request card (cancel)
// ─────────────────────────────────────────────

interface OutgoingRequestCardProps {
  request: FriendRequest
  isCancelling: boolean
  onCancel: (requestId: string) => void
}

export function OutgoingRequestCard({
  request,
  isCancelling,
  onCancel,
}: OutgoingRequestCardProps) {
  const profile = request.receiver!

  return (
    <div className="flex items-center gap-3 p-3 rounded-card bg-surface-800 border border-surface-700 hover:border-surface-600 transition-colors">
      <Avatar url={profile.avatar_url} username={profile.username} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">
          {profile.display_name ?? profile.username}
        </p>
        {profile.display_name && (
          <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
        )}
        <p className="text-xs text-slate-600 mt-0.5">
          Sent {formatDistanceToNow(request.createdAt)}
        </p>
      </div>

      <Button
        id={`cancel-request-${request.id}`}
        variant="ghost"
        size="sm"
        isLoading={isCancelling}
        onClick={() => onCancel(request.id)}
        leftIcon={<X className="size-3.5" aria-hidden="true" />}
        aria-label={`Cancel request to ${profile.username}`}
        className="text-slate-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
      >
        <span className="hidden sm:inline">Cancel</span>
      </Button>
    </div>
  )
}
