import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { RefreshCw } from 'lucide-react'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import { resolveDiceTheme, useCardTheme } from '../themes'

interface AnimatedDiceProps {
  tens: number | null
  units: number | null
  combinedScore: number | null
  hasRerolled?: boolean
  rollKey?: string | number
  highlightWinner?: boolean
  diceThemeId?: string
  size?: 'sm' | 'md'
  singleDieLabel?: string
  singleDieValue?: number | null
}

function D10Face({
  label,
  valueText,
  rolling,
  tone,
  size,
  fillClass,
  textClass,
  glowClass,
  ringBorderClass,
}: {
  label: string
  valueText: string
  rolling: boolean
  tone: 'tens' | 'units'
  size: 'sm' | 'md'
  fillClass: string
  textClass: string
  glowClass: string
  ringBorderClass: string
}) {
  const dim = size === 'sm' ? 'size-16' : 'size-22 sm:size-26'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex items-center justify-center" style={{ perspective: '700px' }}>
        {/* Impact shockwave ring on roll */}
        {rolling && (
          <span
            aria-hidden="true"
            className={clsx(
              'absolute inset-0 rounded-full border-2 pointer-events-none animate-impact-ring motion-reduce:hidden',
              ringBorderClass,
            )}
          />
        )}

        <div
          className={clsx(
            'relative flex items-center justify-center',
            dim,
            glowClass,
            rolling && 'animate-dice-tumble motion-reduce:animate-none',
          )}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
            {/* Outer faceted polyhedron */}
            <polygon points="50,3 95,38 78,94 22,94 5,38" strokeWidth="3.5" className={fillClass} />
            {/* BG3-style inner kite bevels */}
            <polygon
              points="50,3 80,44 50,86 20,44"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.5"
            />
            <line x1="5" y1="38" x2="20" y2="44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
            <line x1="95" y1="38" x2="80" y2="44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
            <line x1="22" y1="94" x2="50" y2="86" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
            <line x1="78" y1="94" x2="50" y2="86" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
          </svg>
          <span
            className={clsx(
              'absolute inset-0 flex items-center justify-center font-mono font-extrabold tracking-tight drop-shadow',
              textClass,
              size === 'sm' ? 'text-lg' : 'text-2xl',
            )}
          >
            {valueText}
          </span>
        </div>
      </div>
      <span
        className={clsx(
          'text-[11px] font-semibold uppercase tracking-wider',
          tone === 'tens' ? 'text-gold-400' : 'text-slate-400',
        )}
      >
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
  diceThemeId,
  size = 'md',
  singleDieLabel,
  singleDieValue,
}: AnimatedDiceProps) {
  const auth = useOptionalAuthContext()
  const { diceThemeId: storeDiceId } = useCardTheme()
  const diceTheme = resolveDiceTheme(diceThemeId ?? auth?.profile?.dice_theme ?? storeDiceId)

  const [isRolling, setIsRolling] = useState(false)

  useEffect(() => {
    const hasVal =
      singleDieLabel !== undefined
        ? singleDieValue !== null && singleDieValue !== undefined
        : tens !== null || units !== null
    if (!hasVal) {
      setIsRolling(false)
      return
    }
    setIsRolling(true)
    const timer = window.setTimeout(() => setIsRolling(false), 850)
    return () => window.clearTimeout(timer)
  }, [tens, units, singleDieLabel, singleDieValue, rollKey])

  if (singleDieLabel !== undefined) {
    return (
      <div className="flex flex-col items-center gap-3" data-dice-theme={diceTheme.id}>
        <D10Face
          label={singleDieLabel}
          valueText={singleDieValue !== null && singleDieValue !== undefined ? String(singleDieValue) : '--'}
          rolling={isRolling}
          tone="tens"
          size={size}
          fillClass={diceTheme.tensFillClass}
          textClass={diceTheme.textColorClass}
          glowClass={diceTheme.glowColorClass}
          ringBorderClass={diceTheme.ringBorderClass}
        />
      </div>
    )
  }

  const tensText = tens !== null ? `${tens}0` : '--'
  const unitsText = units !== null ? `${units}` : '-'

  return (
    <div className="flex flex-col items-center gap-3" data-dice-theme={diceTheme.id}>
      <div className="flex items-center gap-4">
        <D10Face
          label="Tens d10"
          valueText={tensText}
          rolling={isRolling}
          tone="tens"
          size={size}
          fillClass={diceTheme.tensFillClass}
          textClass={diceTheme.textColorClass}
          glowClass={diceTheme.glowColorClass}
          ringBorderClass={diceTheme.ringBorderClass}
        />
        <span className="text-xl font-bold text-slate-500 pb-5">+</span>
        <D10Face
          label="Units d10"
          valueText={unitsText}
          rolling={isRolling}
          tone="units"
          size={size}
          fillClass={diceTheme.unitsFillClass}
          textClass={diceTheme.textColorClass}
          glowClass={diceTheme.glowColorClass}
          ringBorderClass={diceTheme.ringBorderClass}
        />
      </div>

      {/* Combined score badge */}
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono transition-all duration-300 motion-reduce:transition-none',
          combinedScore !== null
            ? highlightWinner
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
              : 'bg-surface-900/90 border-gold-500/50 text-white'
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
