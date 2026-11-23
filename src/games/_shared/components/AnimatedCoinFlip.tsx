import { clsx } from 'clsx'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import { resolveCoinTheme, useCardTheme } from '../themes'
import { Coin3D } from './Coin3D'

interface AnimatedCoinFlipProps {
  choice?: 'heads' | 'tails' | null
  result: 'heads' | 'tails' | null
  flipping?: boolean
  coinThemeId?: string
  label?: string
  flipKey?: string | number
}

export function AnimatedCoinFlip({
  choice,
  result,
  flipping = false,
  coinThemeId,
  label,
  flipKey,
}: AnimatedCoinFlipProps) {
  const auth = useOptionalAuthContext()
  const { coinThemeId: storeCoinId } = useCardTheme()
  const coinTheme = resolveCoinTheme(coinThemeId ?? auth?.profile?.coin_theme ?? storeCoinId)

  const displayFace = result ?? choice ?? 'heads'

  return (
    <div className="flex flex-col items-center gap-3" data-coin-theme={coinTheme.id}>
      <div aria-label={result ? `Coin landed on ${result}` : 'Coin ready to flip'}>
        <Coin3D
          face={displayFace}
          coinThemeId={coinTheme.id}
          flipKey={flipKey ?? (result ? `${result}-${String(flipping)}` : undefined)}
          flipping={flipping}
          size="md"
        />
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
