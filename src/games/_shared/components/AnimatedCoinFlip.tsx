import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface AnimatedCoinFlipProps {
  choice?: 'heads' | 'tails' | null
  result: 'heads' | 'tails' | null
  flipping?: boolean
  label?: string
}

export function AnimatedCoinFlip({
  choice,
  result,
  flipping = false,
  label,
}: AnimatedCoinFlipProps) {
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    if (!result && !flipping) {
      setIsSpinning(false)
      return
    }
    setIsSpinning(true)
    const timer = window.setTimeout(() => setIsSpinning(false), 750)
    return () => window.clearTimeout(timer)
  }, [result, flipping])

  const displayFace = result ?? choice ?? 'heads'

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={clsx(
          'relative size-24 sm:size-28 rounded-full border-4 flex items-center justify-center shadow-[0_8px_28px_rgba(245,158,11,0.35)] transition-transform duration-500 motion-reduce:transition-none',
          displayFace === 'heads'
            ? 'bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-amber-200 text-amber-950'
            : 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 border-slate-100 text-slate-950',
          isSpinning && 'animate-coin-flip motion-reduce:animate-none',
        )}
        aria-label={result ? `Coin landed on ${result}` : 'Coin ready to flip'}
      >
        <div className="size-18 sm:size-20 rounded-full border-2 border-dashed border-current/40 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl font-black leading-none" aria-hidden="true">
            {displayFace === 'heads' ? '♛' : '☾'}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest mt-1">
            {displayFace}
          </span>
        </div>
      </div>

      {label && <p className="text-xs text-slate-400 font-medium">{label}</p>}

      {choice && result && (
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-surface-800 border border-surface-600 text-slate-300">
            Called: <strong className="uppercase">{choice}</strong>
          </span>
          <span
            className={clsx(
              'px-2 py-0.5 rounded border font-semibold',
              choice === result
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300',
            )}
          >
            Result: <span className="uppercase">{result}</span>
          </span>
        </div>
      )}
    </div>
  )
}
