import { useState } from 'react'
import { Palette, X, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import { updatePlayerCardThemes } from '@/services/wallet/walletService'
import { Button } from '@/components/ui/Button'
import {
  useCardTheme,
  type CardBackThemeId,
  type CardFrontThemeId,
} from '../themes'
import { ThemedCard } from './ThemedCard'

interface CardThemeSelectorProps {
  mode?: 'modal' | 'inline'
  compact?: boolean
  className?: string
}

export function CardThemeSelector({
  mode = 'modal',
  compact = false,
  className,
}: CardThemeSelectorProps) {
  const auth = useOptionalAuthContext()
  const {
    frontThemeId: storeFrontId,
    backThemeId: storeBackId,
    setFrontThemeId,
    setBackThemeId,
    frontThemes,
    backThemes,
  } = useCardTheme()

  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeFrontId = (auth?.profile?.card_front_theme as CardFrontThemeId) ?? storeFrontId
  const activeBackId = (auth?.profile?.card_back_theme as CardBackThemeId) ?? storeBackId

  const handleSelectFront = async (id: CardFrontThemeId) => {
    setFrontThemeId(id)
    if (auth?.user?.id) {
      setSaving(true)
      try {
        await updatePlayerCardThemes(auth.user.id, { card_front_theme: id })
        await auth.refreshProfile()
      } catch {
        // Store already updated locally
      } finally {
        setSaving(false)
      }
    }
  }

  const handleSelectBack = async (id: CardBackThemeId) => {
    setBackThemeId(id)
    if (auth?.user?.id) {
      setSaving(true)
      try {
        await updatePlayerCardThemes(auth.user.id, { card_back_theme: id })
        await auth.refreshProfile()
      } catch {
        // Store already updated locally
      } finally {
        setSaving(false)
      }
    }
  }

  const editorBody = (
    <div className="space-y-5">
      {/* Live Recto / Verso Preview */}
      <div className="flex items-center justify-center gap-6 py-4 px-4 rounded-xl bg-surface-900/90 border border-gold-500/25 bg-engei-pattern">
        <div className="flex flex-col items-center gap-2">
          <ThemedCard
            suit="hearts"
            rank="Q"
            size="md"
            frontThemeId={activeFrontId}
            backThemeId={activeBackId}
            ariaLabel="Aperçu Recto (Face)"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
            Recto (Face)
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ThemedCard
            isHidden
            size="md"
            frontThemeId={activeFrontId}
            backThemeId={activeBackId}
            ariaLabel="Aperçu Verso (Dos)"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
            Verso (Dos)
          </span>
        </div>
      </div>

      {/* Card Front Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Face des cartes (Recto)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Face des cartes">
          {frontThemes.map((t) => {
            const active = t.id === activeFrontId
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving}
                onClick={() => void handleSelectFront(t.id)}
                aria-pressed={active}
                className={clsx(
                  'flex items-center gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
                  active
                    ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
                    : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500',
                )}
              >
                <span className="flex -space-x-1 shrink-0" aria-hidden="true">
                  {t.previewSwatches.map((hex, i) => (
                    <span
                      key={i}
                      className="size-3 rounded-full border border-white/30"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{t.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Card Back Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Dos de carte (Verso)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Dos de carte">
          {backThemes.map((t) => {
            const active = t.id === activeBackId
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving}
                onClick={() => void handleSelectBack(t.id)}
                aria-pressed={active}
                className={clsx(
                  'flex items-center gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
                  active
                    ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
                    : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500',
                )}
              >
                <span className="flex -space-x-1 shrink-0" aria-hidden="true">
                  {t.previewSwatches.map((hex, i) => (
                    <span
                      key={i}
                      className="size-3 rounded-full border border-white/30"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{t.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (mode === 'inline') {
    return (
      <div className={clsx('rounded-card bg-surface-800 border border-gold-500/25 p-5', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-100">Mes Cartes (Recto &amp; Verso)</h2>
          </div>
          <span className="text-[11px] text-gold-400/90 font-medium">
            Visible par votre adversaire
          </span>
        </div>
        {editorBody}
      </div>
    )
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        leftIcon={<Palette className="size-3.5 text-gold-400" aria-hidden="true" />}
        className={clsx('border-gold-500/35 hover:border-gold-400/70', className)}
      >
        {compact ? 'Mes Cartes' : 'Personnaliser Mes Cartes'}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Personnaliser Mes Cartes"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-800 border border-gold-500/40 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-gold-400" aria-hidden="true" />
                <h2 className="text-base font-bold text-white">Mes Cartes — Cercle Engei</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
              >
                <X className="size-4" />
              </Button>
            </div>
            {editorBody}
          </div>
        </div>
      )}
    </>
  )
}
