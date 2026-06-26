/**
 * Skeleton loading states for the Friends page tabs.
 */

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-card bg-surface-800 border border-surface-700 animate-pulse">
      <div className="size-10 rounded-full bg-surface-700 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-surface-700" />
        <div className="h-3 w-20 rounded bg-surface-700" />
      </div>
      <div className="h-8 w-20 rounded-btn bg-surface-700" />
    </div>
  )
}

interface FriendsSkeletonProps {
  rows?: number
}

export function FriendsSkeleton({ rows = 4 }: FriendsSkeletonProps) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
