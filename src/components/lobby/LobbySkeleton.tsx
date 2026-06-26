/**
 * Skeleton loaders for lobby pages.
 */

export function GamesPageSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-card bg-surface-800 border border-surface-700 overflow-hidden">
          <div className="h-28 bg-surface-700" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-32 bg-surface-700 rounded" />
            <div className="h-4 w-full bg-surface-700 rounded" />
            <div className="h-4 w-3/4 bg-surface-700 rounded" />
            <div className="h-10 w-full bg-surface-700 rounded-btn mt-4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RoomPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 bg-surface-800 rounded-card border border-surface-700" />
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-surface-800 rounded-card border border-surface-700" />
        ))}
      </div>
    </div>
  )
}
