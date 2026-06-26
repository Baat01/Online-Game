import { clsx } from 'clsx'

interface CharacterCounterProps {
  current: number
  max: number
  className?: string
}

/**
 * Inline character counter for text fields.
 * Turns amber at 80% usage, red when over the limit.
 */
export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const pct = current / max
  const isOver = current > max
  const isNear = pct >= 0.8 && !isOver

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className={clsx(
        'text-xs tabular-nums transition-colors duration-150',
        isOver ? 'text-red-400 font-medium' : isNear ? 'text-gold-400' : 'text-slate-500',
        className,
      )}
    >
      {current} / {max}
    </span>
  )
}
