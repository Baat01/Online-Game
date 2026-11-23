import { clsx } from 'clsx'
import { RefreshCw } from 'lucide-react'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import { resolveDiceTheme, useCardTheme } from '../themes'
import { Dice3D } from './Dice3D'
import type { DieType } from './geometry3d'

interface AnimatedDiceProps {
  tens: number | null
  units: number | null
  combinedScore: number | null
  hasRerolled?: boolean
  rollKey?: string | number
  highlightWinner?: boolean
  diceThemeId?: string
  size?: 'sm' | 'md' | 'lg'
  singleDieLabel?: string
  singleDieValue?: number | null
  singleDieType?: Exclude<DieType, 'd10-tens'>
  tripleD10?: [number, number, number] | null
  targetScore?: number | null
}

function inferSingleDieType(
  explicitType: Exclude<DieType, 'd10-tens'>,
  label?: string,
): Exclude<DieType, 'd10-tens'> {
  const lower = label?.toLowerCase() ?? ''
  if (lower === 'd4') return 'd4'
  if (lower === 'd6') return 'd6'
  if (lower === 'd8') return 'd8'
  if (lower === 'd10') return 'd10'
  if (lower === 'd12') return 'd12'
  if (lower === 'd16') return 'd16'
  if (lower === 'd20') return 'd20'
  return explicitType
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
  singleDieType = 'd20',
  tripleD10,
  targetScore,
}: AnimatedDiceProps) {
  const auth = useOptionalAuthContext()
  const { diceThemeId: storeDiceId } = useCardTheme()
  const diceTheme = resolveDiceTheme(diceThemeId ?? auth?.profile?.dice_theme ?? storeDiceId)

  const resolvedSingleType = inferSingleDieType(singleDieType, singleDieLabel)

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center gap-3 rounded-2xl px-4 py-3.5 border border-gold-500/35 overflow-hidden',
        'bg-gradient-to-b from-[#131018]/95 via-[#0b0a10]/95 to-[#16111b]/95 shadow-[inset_0_2px_20px_rgba(0,0,0,0.85)]',
      )}
      data-dice-theme={diceTheme.id}
    >
      {/* Ornamental horizontal divider bar across the middle of the roll stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center"
      >
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/35 to-amber-300/60" />
        <span className="mx-2 size-2 rotate-45 border border-amber-400/60 bg-amber-500/20" />
        <div className="flex-1 h-[1.5px] bg-gradient-to-l from-transparent via-amber-400/35 to-amber-300/60" />
      </div>

      {/* Ornate BG3-style difficulty / target header */}
      {typeof targetScore === 'number' && (
        <div className="relative z-10 px-3 py-0.5 rounded-full bg-gold-500/15 border border-gold-400/50 text-[11px] font-bold uppercase tracking-wider text-gold-300">
          Classe de difficulté : <span className="font-mono text-amber-200">{targetScore}</span>
        </div>
      )}

      {tripleD10 ? (
        <div className="relative z-10 flex items-center gap-2">
          {tripleD10.map((digit, idx) => (
            <Dice3D
              key={idx}
              dieType="d10"
              value={digit}
              diceThemeId={diceTheme.id}
              rollKey={rollKey}
              size="sm"
              label={`Anomalie d10 #${idx + 1}`}
            />
          ))}
        </div>
      ) : singleDieLabel !== undefined ? (
        <div className="relative z-10">
          <Dice3D
            dieType={resolvedSingleType}
            value={singleDieValue ?? null}
            diceThemeId={diceTheme.id}
            rollKey={rollKey}
            size={size}
            label={singleDieLabel}
          />
        </div>
      ) : (
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <Dice3D
            dieType="d10-tens"
            value={tens}
            diceThemeId={diceTheme.id}
            rollKey={rollKey}
            size={size}
            label="Tens d10"
          />
          <span className="text-xl font-bold text-slate-500 pb-5">+</span>
          <Dice3D
            dieType="d10"
            value={units}
            diceThemeId={diceTheme.id}
            rollKey={rollKey}
            size={size}
            label="Units d10"
          />
        </div>
      )}

      {/* Combined score badge */}
      {singleDieLabel === undefined && !tripleD10 && (
        <div
          className={clsx(
            'relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono transition-all duration-300 motion-reduce:transition-none',
            combinedScore !== null
              ? highlightWinner
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                : 'bg-surface-900/90 border-gold-500/50 text-white'
              : 'bg-surface-900/50 border-slate-700 text-slate-500',
          )}
        >
          <span className="text-xs font-sans uppercase tracking-wider text-slate-400">Score</span>
          <span className="text-xl font-extrabold">
            {combinedScore !== null ? combinedScore : '--'}
          </span>
          {hasRerolled && (
            <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <RefreshCw className="size-2.5" aria-hidden="true" />
              Rerolled
            </span>
          )}
        </div>
      )}
    </div>
  )
}
