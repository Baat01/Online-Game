import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
}

/**
 * Generic empty-state panel used across Friends page tabs.
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-slate-600 opacity-50">{icon}</div>
      <p className="text-slate-400 font-medium">{title}</p>
      {description && <p className="text-sm text-slate-600 max-w-xs">{description}</p>}
    </div>
  )
}
