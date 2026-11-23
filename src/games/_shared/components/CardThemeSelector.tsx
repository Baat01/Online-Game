import { Palette } from 'lucide-react'
import { clsx } from 'clsx'
import { useCardTheme, type CardThemeId } from '../themes'

interface CardThemeSelectorProps {
  compact?: boolean
  className?: string
}

export function CardThemeSelector({ compact = false, className }: CardThemeSelectorProps) {
  const { themeId, setThemeId, themes } = useCardTheme()

  return (
    <div
      className={clsx(
        'inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-900/75 border border-white/10 px-2.5 py-1.5 backdrop-blur-sm',
        className,
      )}
      role="group"
      aria-label="Card deck theme selector"
    >
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 mr-1">
        <Palette className="size-3.5 text-brand-400" aria-hidden="true" />
        {!compact && <span>Deck:</span>}
      </span>

      {themes.map((t) => {
        const active = t.id === themeId
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setThemeId(t.id as CardThemeId)}
            aria-pressed={active}
            title={t.description}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all cursor-pointer',
              active
                ? 'bg-brand-500/20 text-brand-300 border border-brand-400/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent',
            )}
          >
            <span className="flex -space-x-1" aria-hidden="true">
              {t.previewSwatches.map((hex, i) => (
                <span
                  key={i}
                  className="size-2.5 rounded-full border border-white/30"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>
            <span>{t.name}</span>
          </button>
        )
      })}
    </div>
  )
}
