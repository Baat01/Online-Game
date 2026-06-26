import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Clock, Search, UserPlus } from 'lucide-react'
import { clsx } from 'clsx'
import { useFriends } from '@/hooks/useFriends'
import { useToast } from '@/components/ui/Toast'
import { FriendCard } from '@/components/friends/FriendCard'
import { IncomingRequestCard, OutgoingRequestCard } from '@/components/friends/RequestCard'
import { UserSearchInput } from '@/components/friends/UserSearchInput'
import { UserSearchResultCard } from '@/components/friends/UserSearchResultCard'
import { FriendsSkeleton } from '@/components/friends/FriendsSkeleton'
import { EmptyState } from '@/components/friends/EmptyState'

// ─────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────

type Tab = 'friends' | 'requests' | 'discover'

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'requests', label: 'Requests', icon: Clock },
  { id: 'discover', label: 'Discover', icon: Search },
]

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

/**
 * Friends page — /friends (protected).
 *
 * Three tabs (persisted in URL via ?tab=):
 * 1. Friends — friend list with remove action
 * 2. Requests — incoming (accept/reject) + outgoing (cancel)
 * 3. Discover — user search with add action
 */
export function FriendsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab | null) ?? 'friends'

  const setTab = (tab: Tab) => {
    setSearchParams({ tab }, { replace: true })
  }

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,
    isLoading,
    isSearching,
    sendRequest,
    accept,
    reject,
    cancel,
    remove,
    search,
    clearSearch,
  } = useFriends()

  const { toast } = useToast()

  // ── Pending mutation targets (to show loading on individual buttons) ───────
  const [pendingAccept, setPendingAccept] = useState<string | null>(null)
  const [pendingReject, setPendingReject] = useState<string | null>(null)
  const [pendingCancel, setPendingCancel] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [pendingSend, setPendingSend] = useState<string | null>(null)

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')

  const handleDebouncedSearch = useCallback(
    (query: string) => {
      if (query.trim().length < 2) {
        clearSearch()
        return
      }
      search(query).catch(() => toast('Search failed. Please try again.', 'error'))
    },
    [search, clearSearch, toast],
  )

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleAccept = async (requestId: string) => {
    setPendingAccept(requestId)
    try {
      await accept(requestId)
      toast('Friend request accepted!', 'success')
    } catch {
      toast('Failed to accept request.', 'error')
    } finally {
      setPendingAccept(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setPendingReject(requestId)
    try {
      await reject(requestId)
      toast('Request rejected.', 'info')
    } catch {
      toast('Failed to reject request.', 'error')
    } finally {
      setPendingReject(null)
    }
  }

  const handleCancel = async (requestId: string) => {
    setPendingCancel(requestId)
    try {
      await cancel(requestId)
      toast('Request cancelled.', 'info')
    } catch {
      toast('Failed to cancel request.', 'error')
    } finally {
      setPendingCancel(null)
    }
  }

  const handleRemove = async (friendId: string) => {
    setPendingRemove(friendId)
    try {
      await remove(friendId)
      toast('Friend removed.', 'info')
    } catch {
      toast('Failed to remove friend.', 'error')
    } finally {
      setPendingRemove(null)
    }
  }

  const handleSendRequest = async (userId: string) => {
    setPendingSend(userId)
    try {
      await sendRequest(userId)
      toast('Friend request sent!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send request.', 'error')
    } finally {
      setPendingSend(null)
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Friends</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your friends and discover new players.</p>
      </div>

      {/* ── Tabs ── */}
      <div
        role="tablist"
        aria-label="Friends navigation"
        className="flex gap-1 p-1 rounded-card bg-surface-800 border border-surface-700 mb-6"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const badge =
            id === 'requests' && incomingRequests.length > 0 ? incomingRequests.length : null

          return (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${id}`}
              onClick={() => setTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-500/15 text-brand-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              {badge !== null && (
                <span className="ml-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Panels ── */}

      {/* Friends Tab */}
      <div
        id="tabpanel-friends"
        role="tabpanel"
        aria-labelledby="tab-friends"
        hidden={activeTab !== 'friends'}
      >
        {isLoading ? (
          <FriendsSkeleton />
        ) : friends.length === 0 ? (
          <EmptyState
            icon={<Users className="size-12" />}
            title="No friends yet"
            description="Head to the Discover tab to find and add other players."
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 mb-1">
              {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
            </p>
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                isRemoving={pendingRemove === friend.friendId}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Requests Tab */}
      <div
        id="tabpanel-requests"
        role="tabpanel"
        aria-labelledby="tab-requests"
        hidden={activeTab !== 'requests'}
      >
        {isLoading ? (
          <FriendsSkeleton rows={3} />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Incoming */}
            <section aria-label="Incoming friend requests">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Incoming ({incomingRequests.length})
              </h2>
              {incomingRequests.length === 0 ? (
                <EmptyState
                  icon={<UserPlus className="size-10" />}
                  title="No incoming requests"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {incomingRequests.map((req) => (
                    <IncomingRequestCard
                      key={req.id}
                      request={req}
                      isAccepting={pendingAccept === req.id}
                      isRejecting={pendingReject === req.id}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Outgoing */}
            <section aria-label="Outgoing friend requests">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Outgoing ({outgoingRequests.length})
              </h2>
              {outgoingRequests.length === 0 ? (
                <EmptyState icon={<Clock className="size-10" />} title="No outgoing requests" />
              ) : (
                <div className="flex flex-col gap-2">
                  {outgoingRequests.map((req) => (
                    <OutgoingRequestCard
                      key={req.id}
                      request={req}
                      isCancelling={pendingCancel === req.id}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Discover Tab */}
      <div
        id="tabpanel-discover"
        role="tabpanel"
        aria-labelledby="tab-discover"
        hidden={activeTab !== 'discover'}
      >
        <div className="flex flex-col gap-4">
          <UserSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onDebouncedChange={handleDebouncedSearch}
            isSearching={isSearching}
          />

          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <p className="text-sm text-slate-500 text-center py-4">
              Type at least 2 characters to search.
            </p>
          )}

          {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
            <EmptyState
              icon={<Search className="size-10" />}
              title="No users found"
              description={`No users matching "${searchQuery}".`}
            />
          )}

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {searchResults.map((result) => (
                <UserSearchResultCard
                  key={result.id}
                  result={result}
                  isSending={pendingSend === result.id}
                  onSendRequest={handleSendRequest}
                />
              ))}
            </div>
          )}

          {searchQuery.trim().length === 0 && (
            <EmptyState
              icon={<Search className="size-10" />}
              title="Search for players"
              description="Enter a username to find and add friends."
            />
          )}
        </div>
      </div>
    </div>
  )
}
