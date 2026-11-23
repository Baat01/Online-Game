import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import { resolveCoinTheme, useCardTheme } from '../themes'

interface AnimatedCoinFlipProps {
  choice?: 'heads' | 'tails' | null
  result: 'heads' | 'tails' | null
  flipping?: boolean
  coinThemeId?: string
  label?: string
}

export function AnimatedCoinFlip({
  choice,
  result,
  flipping = false,
  coinThemeId,
  label,
}: AnimatedCoinFlipProps) {
  const auth = useOptionalAuthContext()
  const { coinThemeId: storeCoinId } = useCardTheme()
  const coinTheme = resolveCoinTheme(coinThemeId ?? auth?.profile?.coin_theme ?? storeCoinId)

  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    if (!result && !flipping) {
      setIsSpinning(false)
      return
    }
    setIsSpinning(true)
    const timer = window.setTimeout(() => setIsSpinning(false), 950)
    return () => window.clearTimeout(timer)
  }, [result, flipping])

  const displayFace = result ?? choice ?? 'heads'
  const faceGradient =
    displayFace === 'heads' ? coinTheme.headsGradientClass : coinTheme.tailsGradientClass
  const faceSymbol = displayFace === 'heads' ? coinTheme.headsSymbol : coinTheme.tailsSymbol
  const isRailgun = coinTheme.id === 'kinto-railgun-coin' || coinTheme.id === 'railgun-coin'

  return (
    <div className="flex flex-col items-center gap-3" data-coin-theme={coinTheme.id}>
      <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
        {isSpinning && (
          <span
            aria-hidden="true"
            className={clsx(
              'absolute inset-0 rounded-full border-2 pointer-events-none animate-impact-ring motion-reduce:hidden',
              coinTheme.rimColorClass,
            )}
          />
        )}
        {isRailgun && isSpinning && (
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-full border border-dashed border-amber-400/75 pointer-events-none animate-spin motion-reduce:hidden"
          />
        )}

        <div
          className={clsx(
            'relative size-24 sm:size-28 rounded-full border-4 bg-gradient-to-br flex items-center justify-center transition-transform duration-500 motion-reduce:transition-none',
            faceGradient,
            coinTheme.glowClass,
            isSpinning && 'animate-coin-flip motion-reduce:animate-none',
          )}
          aria-label={result ? `Coin landed on ${result}` : 'Coin ready to flip'}
        >
          {/* Specular rim & inner minted ring */}
          <div className="size-18 sm:size-20 rounded-full border-2 border-dashed border-current/45 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[0.5px]">
            <span className="text-2xl sm:text-3xl font-black leading-none" aria-hidden="true">
              {faceSymbol}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest mt-1">
              {displayFace === 'heads' ? 'Face (Heads)' : 'Pile (Tails)'}
            </span>
          </div>
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
