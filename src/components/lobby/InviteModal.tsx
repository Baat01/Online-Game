import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/friends/Avatar'
import { OnlineIndicator } from '@/components/presence/OnlineIndicator'
import { usePresence } from '@/hooks/usePresence'
import { useFriends } from '@/hooks/useFriends'
import type { GameInvitation } from '@/types/lobby'
import type { Friend } from '@/types/friends'

interface InviteModalProps {
  roomId: string
  gameSlug: string
  outgoingInvites: GameInvitation[]
  isOpen: boolean
  onClose: () => void
  onInvite: (receiverId: string) => Promise<void>
}

/**
 * Modal for inviting friends to a game room.
 * Shows friends list sorted online-first.
 * Displays pending/accepted state for already-invited friends.
 */
export function InviteModal({
  roomId: _roomId,
  gameSlug: _gameSlug,
  outgoingInvites,
  isOpen,
  onClose,
  onInvite,
}: InviteModalProps) {
  const { friends, isLoading: isFriendsLoading } = useFriends()
  const friendIds = friends.map((f) => f.friendId)
  const { isOnline } = usePresence(friendIds)

  const [search, setSearch] = useState('')
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const getInviteStatus = useCallback(
    (friendId: string): GameInvitation['status'] | null => {
      const inv = outgoingInvites.find((i) => i.receiverId === friendId)
      return inv?.status ?? null
    },
    [outgoingInvites],
  )

  const sortedFriends: Friend[] = [...friends].sort((a, b) => {
    const aOnline = isOnline(a.friendId) ? 1 : 0
    const bOnline = isOnline(b.friendId) ? 1 : 0
    if (aOnline !== bOnline) return bOnline - aOnline
    return (a.profile.display_name ?? a.profile.username).localeCompare(
      b.profile.display_name ?? b.profile.username,
    )
  })

  const filtered = search.trim().length >= 1
    ? sortedFriends.filter((f) =>
        f.profile.username.toLowerCase().includes(search.toLowerCase()) ||
        (f.profile.display_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : sortedFriends

  const handleInvite = async (friendId: string) => {
    setPendingInvite(friendId)
    try {
      await onInvite(friendId)
    } finally {
      setPendingInvite(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-card shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <h2 id="invite-modal-title" className="text-base font-semibold text-slate-100">
            Invite Friends
          </h2>
          <Button
            id="close-invite-modal"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close invite dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-surface-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search friends…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-900 border border-surface-600 rounded-btn text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
            />
          </div>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isFriendsLoading ? (
            <p className="text-sm text-slate-500 text-center py-6">Loading friends…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              {friends.length === 0 ? 'No friends added yet.' : 'No friends match your search.'}
            </p>
          ) : (
            filtered.map((friend) => {
              const online = isOnline(friend.friendId)
              const status = getInviteStatus(friend.friendId)
              const alreadyInvited = status === 'pending'
              const accepted = status === 'accepted'

              return (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-btn hover:bg-surface-700/50 transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar url={friend.profile.avatar_url} username={friend.profile.username} size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <OnlineIndicator isOnline={online} size="sm" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {friend.profile.display_name ?? friend.profile.username}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {online ? 'Online now' : '@' + friend.profile.username}
                    </p>
                  </div>

                  {accepted ? (
                    <span className="text-xs font-semibold text-brand-400 px-2 py-1 rounded bg-brand-500/10">
                      Joined ✓
                    </span>
                  ) : alreadyInvited ? (
                    <span className="text-xs text-slate-500 px-2 py-1 rounded bg-surface-700">
                      Invited
                    </span>
                  ) : (
                    <Button
                      id={`invite-${friend.friendId}`}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingInvite === friend.friendId}
                      onClick={() => handleInvite(friend.friendId)}
                      leftIcon={<Send className="size-3.5" aria-hidden="true" />}
                    >
                      Invite
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
