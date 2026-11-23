import { useState } from 'react'
import { Palette, X, Sparkles, Lock, Dices } from 'lucide-react'
import { clsx } from 'clsx'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import { updatePlayerCosmetics } from '@/services/wallet/walletService'
import { Button } from '@/components/ui/Button'
import {
  isThemeUnlocked,
  useCardTheme,
  type CardBackThemeId,
  type CardFrontThemeId,
  type CoinThemeId,
  type DiceThemeId,
} from '../themes'
import { ThemedCard } from './ThemedCard'
import { AnimatedDice } from './AnimatedDice'
import { AnimatedCoinFlip } from './AnimatedCoinFlip'

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
    diceThemeId: storeDiceId,
    coinThemeId: storeCoinId,
    setFrontThemeId,
    setBackThemeId,
    setDiceThemeId,
    setCoinThemeId,
    frontThemes,
    backThemes,
    diceThemes,
    coinThemes,
  } = useCardTheme()

  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewRollKey, setPreviewRollKey] = useState(0)

  const activeFrontId = (auth?.profile?.card_front_theme as CardFrontThemeId) ?? storeFrontId
  const activeBackId = (auth?.profile?.card_back_theme as CardBackThemeId) ?? storeBackId
  const activeDiceId = (auth?.profile?.dice_theme as DiceThemeId) ?? storeDiceId
  const activeCoinId = (auth?.profile?.coin_theme as CoinThemeId) ?? storeCoinId

  const saveCosmetic = async (patch: {
    card_front_theme?: string
    card_back_theme?: string
    dice_theme?: string
    coin_theme?: string
  }) => {
    if (!auth?.user?.id) return
    setSaving(true)
    try {
      await updatePlayerCosmetics(auth.user.id, patch)
      await auth.refreshProfile()
    } catch {
      // Store already updated locally
    } finally {
      setSaving(false)
    }
  }

  const handleSelectFront = async (id: CardFrontThemeId, unlocked: boolean) => {
    if (!unlocked) return
    setFrontThemeId(id)
    await saveCosmetic({ card_front_theme: id })
  }

  const handleSelectBack = async (id: CardBackThemeId, unlocked: boolean) => {
    if (!unlocked) return
    setBackThemeId(id)
    await saveCosmetic({ card_back_theme: id })
  }

  const handleSelectDice = async (id: DiceThemeId, unlocked: boolean) => {
    if (!unlocked) return
    setDiceThemeId(id)
    setPreviewRollKey((k) => k + 1)
    await saveCosmetic({ dice_theme: id })
  }

  const handleSelectCoin = async (id: CoinThemeId, unlocked: boolean) => {
    if (!unlocked) return
    setCoinThemeId(id)
    await saveCosmetic({ coin_theme: id })
  }

  const editorBody = (
    <div className="space-y-6">
      {/* Live Recto / Verso + Dice / Coin Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 px-4 rounded-xl bg-surface-900/90 border border-gold-500/25 bg-engei-pattern">
        <div className="flex items-center justify-center gap-5">
          <div className="flex flex-col items-center gap-1.5">
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

          <div className="flex flex-col items-center gap-1.5">
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

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-4">
            <AnimatedDice
              tens={7}
              units={3}
              combinedScore={73}
              diceThemeId={activeDiceId}
              rollKey={previewRollKey}
              size="sm"
            />
            <AnimatedCoinFlip
              choice="heads"
              result="heads"
              coinThemeId={activeCoinId}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPreviewRollKey((k) => k + 1)}
            leftIcon={<Dices className="size-3.5" />}
          >
            Tester l&apos;animation 3D
          </Button>
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
            const unlocked = isThemeUnlocked(t.id, t.unlockedByDefault, auth?.profile)
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving || !unlocked}
                onClick={() => void handleSelectFront(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : 'Verrouillé — Débloqué par un Administrateur'}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all',
                  !unlocked
                    ? 'bg-surface-900/40 border-surface-700/60 text-slate-500 opacity-70 cursor-not-allowed'
                    : active
                      ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm cursor-pointer'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500 cursor-pointer',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
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
                </div>
                {!unlocked && (
                  <Lock className="size-3.5 shrink-0 text-amber-400" aria-label="Verrouillé" />
                )}
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
            const unlocked = isThemeUnlocked(t.id, t.unlockedByDefault, auth?.profile)
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving || !unlocked}
                onClick={() => void handleSelectBack(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : 'Verrouillé — Débloqué par un Administrateur'}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all',
                  !unlocked
                    ? 'bg-surface-900/40 border-surface-700/60 text-slate-500 opacity-70 cursor-not-allowed'
                    : active
                      ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm cursor-pointer'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500 cursor-pointer',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
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
                </div>
                {!unlocked && (
                  <Lock className="size-3.5 shrink-0 text-amber-400" aria-label="Verrouillé" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dice Theme Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Jeu de dés (2d10)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Jeu de dés">
          {diceThemes.map((t) => {
            const active = t.id === activeDiceId
            const unlocked = isThemeUnlocked(t.id, t.unlockedByDefault, auth?.profile)
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving || !unlocked}
                onClick={() => void handleSelectDice(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : 'Verrouillé — Débloqué par un Administrateur'}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all',
                  !unlocked
                    ? 'bg-surface-900/40 border-surface-700/60 text-slate-500 opacity-70 cursor-not-allowed'
                    : active
                      ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm cursor-pointer'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500 cursor-pointer',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
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
                </div>
                {!unlocked && (
                  <Lock className="size-3.5 shrink-0 text-amber-400" aria-label="Verrouillé" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Coin Theme Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Pièce de tirage (Pile ou Face)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Jeu de pièces">
          {coinThemes.map((t) => {
            const active = t.id === activeCoinId
            const unlocked = isThemeUnlocked(t.id, t.unlockedByDefault, auth?.profile)
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving || !unlocked}
                onClick={() => void handleSelectCoin(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : 'Verrouillé — Débloqué par un Administrateur'}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all',
                  !unlocked
                    ? 'bg-surface-900/40 border-surface-700/60 text-slate-500 opacity-70 cursor-not-allowed'
                    : active
                      ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm cursor-pointer'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500 cursor-pointer',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
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
                </div>
                {!unlocked && (
                  <Lock className="size-3.5 shrink-0 text-amber-400" aria-label="Verrouillé" />
                )}
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
            <h2 className="text-base font-bold text-slate-100">
              Mes Cartes &amp; Accessoires
            </h2>
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
        {compact ? 'Mes Cartes' : 'Mes Cartes & Accessoires'}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Personnaliser Mes Cartes et Accessoires"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-surface-800 border border-gold-500/40 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-gold-400" aria-hidden="true" />
                <h2 className="text-base font-bold text-white">
                  Mes Cartes &amp; Accessoires — Cercle Engei
                </h2>
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
