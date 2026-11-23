import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { RefreshCw } from 'lucide-react'

interface AnimatedDiceProps {
  tens: number | null
  units: number | null
  combinedScore: number | null
  hasRerolled?: boolean
  rollKey?: string | number
  highlightWinner?: boolean
  size?: 'sm' | 'md'
}

function D10Face({
  label,
  valueText,
  rolling,
  tone,
  size,
}: {
  label: string
  valueText: string
  rolling: boolean
  tone: 'tens' | 'units'
  size: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'size-16' : 'size-20 sm:size-24'
  const fillClass =
    tone === 'tens'
      ? 'fill-indigo-950 stroke-indigo-400'
      : 'fill-violet-950 stroke-amber-400'
  const labelColor = tone === 'tens' ? 'text-indigo-300' : 'text-amber-300'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={clsx(
          'relative flex items-center justify-center',
          dim,
          rolling && 'animate-dice-tumble motion-reduce:animate-none',
        )}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" aria-hidden="true">
          <polygon
            points="50,4 94,38 78,92 22,92 6,38"
            strokeWidth="3.5"
            className={fillClass}
          />
          <polygon
            points="50,4 78,44 50,86 22,44"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
          />
        </svg>
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center font-mono font-extrabold tracking-tight text-white',
            size === 'sm' ? 'text-lg' : 'text-2xl',
          )}
        >
          {valueText}
        </span>
      </div>
      <span className={clsx('text-[11px] font-semibold uppercase tracking-wider', labelColor)}>
        {label}
      </span>
    </div>
  )
}

export function AnimatedDice({
  tens,
  units,
  combinedScore,
  hasRerolled = false,
  rollKey,
  highlightWinner = false,
  size = 'md',
}: AnimatedDiceProps) {
  const [isRolling, setIsRolling] = useState(false)

  useEffect(() => {
    if (tens === null && units === null) {
      setIsRolling(false)
      return
    }
    setIsRolling(true)
    const timer = window.setTimeout(() => setIsRolling(false), 550)
    return () => window.clearTimeout(timer)
  }, [tens, units, rollKey])

  const tensText = tens !== null ? `${tens}0` : '--'
  const unitsText = units !== null ? `${units}` : '-'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <D10Face
          label="Tens d10"
          valueText={tensText}
          rolling={isRolling}
          tone="tens"
          size={size}
        />
        <span className="text-xl font-bold text-slate-500 pb-5">+</span>
        <D10Face
          label="Units d10"
          valueText={unitsText}
          rolling={isRolling}
          tone="units"
          size={size}
        />
      </div>

      {/* Combined score badge */}
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono transition-all duration-300 motion-reduce:transition-none',
          combinedScore !== null
            ? highlightWinner
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
              : 'bg-surface-900/90 border-indigo-400/50 text-white'
            : 'bg-surface-900/50 border-slate-700 text-slate-500',
        )}
      >
        <span className="text-xs font-sans uppercase tracking-wider text-slate-400">Score</span>
        <span className="text-xl font-extrabold">{combinedScore !== null ? combinedScore : '--'}</span>
        {hasRerolled && (
          <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <RefreshCw className="size-2.5" aria-hidden="true" />
            Rerolled
          </span>
        )}
      </div>
    </div>
  )
}
