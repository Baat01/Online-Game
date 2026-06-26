import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  /** Adds a subtle glow border — useful for highlighted/active states */
  glow?: boolean
  /** Makes the card clickable with hover lift effect */
  interactive?: boolean
  onClick?: () => void
}

/**
 * Surface card — the primary container component.
 * Used for game tiles, friend list items, info panels, etc.
 */
export function Card({ children, className, glow, interactive, onClick }: CardProps) {
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick?.()
            }
          : undefined
      }
      className={clsx(
        'rounded-card bg-surface-800 border border-surface-700',
        'transition-all duration-200',
        glow && 'shadow-lg shadow-brand-500/20 border-brand-500/40',
        interactive && [
          'cursor-pointer select-none',
          'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 hover:border-surface-600',
          'active:translate-y-0',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Convenience sub-components for structured card layout */
Card.Header = function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('px-5 pt-5 pb-3 border-b border-surface-700', className)}>{children}</div>
  )
}

Card.Body = function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>
}

Card.Footer = function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('px-5 pb-5 pt-3 border-t border-surface-700', className)}>{children}</div>
  )
}
