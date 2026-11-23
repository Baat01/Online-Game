import { useRef, useState } from 'react'
import {
  Palette,
  X,
  Sparkles,
  Lock,
  Dices,
  RotateCcw,
  ShoppingBag,
  Check,
  FlipHorizontal2,
  Coins,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import {
  formatYen,
  purchaseTheme,
  updatePlayerCosmetics,
} from '@/services/wallet/walletService'
import { Button } from '@/components/ui/Button'
import {
  UNDERTALE_TAROT_ARCANA,
  UNDERTALE_TAROT_DECK_META,
  isThemeUnlocked,
  useCardTheme,
  type CardBackThemeId,
  type CoinThemeId,
  type DiceThemeId,
  type StandardCardFrontThemeId,
} from '../themes'
import { ThemedCard } from './ThemedCard'
import { TarotArcanaCard } from './TarotArcanaCard'
import { AnimatedDice } from './AnimatedDice'
import { AnimatedCoinFlip } from './AnimatedCoinFlip'

interface CardThemeSelectorProps {
  mode?: 'modal' | 'inline'
  compact?: boolean
  className?: string
}

type InspectorCategory = 'front' | 'back' | 'dice' | 'coin' | 'tarot'

interface InspectedItem {
  category: InspectorCategory
  id: string
  name: string
  description: string
  unlockedByDefault: boolean
  priceYen: number
}

const INSPECTOR_RANKS = ['A', 'J', 'Q', 'K', '10'] as const

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
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [shopStatus, setShopStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [previewRollKey, setPreviewRollKey] = useState(0)
  const [coinFlipResult, setCoinFlipResult] = useState<'heads' | 'tails'>('heads')

  // Interactive 3D Inspector State
  const [inspectorMode, setInspectorMode] = useState<InspectorCategory>('front')
  const [inspectedFrontId, setInspectedFrontId] = useState<StandardCardFrontThemeId | null>(null)
  const [inspectedBackId, setInspectedBackId] = useState<CardBackThemeId | null>(null)
  const [inspectedDiceId, setInspectedDiceId] = useState<DiceThemeId | null>(null)
  const [inspectedCoinId, setInspectedCoinId] = useState<CoinThemeId | null>(null)
  const [inspectorFlipped, setInspectorFlipped] = useState(false)
  const [inspectorRank, setInspectorRank] = useState<(typeof INSPECTOR_RANKS)[number]>('Q')
  const [inspectorTarotIdx, setInspectorTarotIdx] = useState(20) // XX Sans by default
  const [rotX, setRotX] = useState(6)
  const [rotY, setRotY] = useState(-10)
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })

  const activeFrontId = (auth?.profile?.card_front_theme as StandardCardFrontThemeId) ?? storeFrontId
  const activeBackId = (auth?.profile?.card_back_theme as CardBackThemeId) ?? storeBackId
  const activeDiceId = (auth?.profile?.dice_theme as DiceThemeId) ?? storeDiceId
  const activeCoinId = (auth?.profile?.coin_theme as CoinThemeId) ?? storeCoinId

  const shownFrontId = inspectedFrontId ?? activeFrontId
  const shownBackId = inspectedBackId ?? activeBackId
  const shownDiceId = inspectedDiceId ?? activeDiceId
  const shownCoinId = inspectedCoinId ?? activeCoinId

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

  const handleSelectFront = async (id: StandardCardFrontThemeId, unlocked: boolean) => {
    setInspectorMode('front')
    setInspectedFrontId(id)
    setInspectorFlipped(false)
    if (!unlocked) return
    setFrontThemeId(id)
    await saveCosmetic({ card_front_theme: id })
  }

  const handleSelectBack = async (id: CardBackThemeId, unlocked: boolean) => {
    setInspectorMode('back')
    setInspectedBackId(id)
    setInspectorFlipped(true)
    if (!unlocked) return
    setBackThemeId(id)
    await saveCosmetic({ card_back_theme: id })
  }

  const handleSelectDice = async (id: DiceThemeId, unlocked: boolean) => {
    setInspectorMode('dice')
    setInspectedDiceId(id)
    setPreviewRollKey((k) => k + 1)
    if (!unlocked) return
    setDiceThemeId(id)
    await saveCosmetic({ dice_theme: id })
  }

  const handleSelectCoin = async (id: CoinThemeId, unlocked: boolean) => {
    setInspectorMode('coin')
    setInspectedCoinId(id)
    setCoinFlipResult((prev) => (prev === 'heads' ? 'tails' : 'heads'))
    if (!unlocked) return
    setCoinThemeId(id)
    await saveCosmetic({ coin_theme: id })
  }

  const handlePurchase = async (item: InspectedItem) => {
    if (!auth?.user?.id) return
    setBuyingId(item.id)
    setShopStatus(null)
    try {
      await purchaseTheme(auth.user.id, item.id)
      await auth.refreshProfile()
      setShopStatus({ type: 'ok', text: `${item.name} débloqué dans votre collection ENGEI !` })
      // Auto-equip immediately on purchase when applicable
      if (item.category === 'front') {
        setFrontThemeId(item.id as StandardCardFrontThemeId)
        await saveCosmetic({ card_front_theme: item.id })
      } else if (item.category === 'back') {
        setBackThemeId(item.id as CardBackThemeId)
        await saveCosmetic({ card_back_theme: item.id })
      } else if (item.category === 'dice') {
        setDiceThemeId(item.id as DiceThemeId)
        await saveCosmetic({ dice_theme: item.id })
      } else if (item.category === 'coin') {
        setCoinThemeId(item.id as CoinThemeId)
        await saveCosmetic({ coin_theme: item.id })
      }
    } catch (err) {
      setShopStatus({ type: 'err', text: err instanceof Error ? err.message : 'Achat impossible.' })
    } finally {
      setBuyingId(null)
    }
  }

  // Resolve current inspected item metadata for the 3D Inspector action bar
  const inspectedItem: InspectedItem = (() => {
    if (inspectorMode === 'tarot') {
      return {
        category: 'tarot',
        id: UNDERTALE_TAROT_DECK_META.id,
        name: UNDERTALE_TAROT_DECK_META.name,
        description: UNDERTALE_TAROT_DECK_META.description,
        unlockedByDefault: UNDERTALE_TAROT_DECK_META.unlockedByDefault,
        priceYen: UNDERTALE_TAROT_DECK_META.priceYen,
      }
    }
    if (inspectorMode === 'back') {
      const cfg = backThemes.find((b) => b.id === shownBackId) ?? backThemes[0]
      return { category: 'back', ...cfg }
    }
    if (inspectorMode === 'dice') {
      const cfg = diceThemes.find((d) => d.id === shownDiceId) ?? diceThemes[0]
      return { category: 'dice', ...cfg }
    }
    if (inspectorMode === 'coin') {
      const cfg = coinThemes.find((c) => c.id === shownCoinId) ?? coinThemes[0]
      return { category: 'coin', ...cfg }
    }
    const cfg = frontThemes.find((f) => f.id === shownFrontId) ?? frontThemes[0]
    return { category: 'front', ...cfg }
  })()

  const inspectedUnlocked = isThemeUnlocked(
    inspectedItem.id,
    inspectedItem.unlockedByDefault,
    auth?.profile,
  )

  const isInspectedEquipped =
    (inspectedItem.category === 'front' && inspectedItem.id === activeFrontId) ||
    (inspectedItem.category === 'back' && inspectedItem.id === activeBackId) ||
    (inspectedItem.category === 'dice' && inspectedItem.id === activeDiceId) ||
    (inspectedItem.category === 'coin' && inspectedItem.id === activeCoinId)

  const editorBody = (
    <div className="space-y-6">
      {/* ── Interactive 3D Inspector Stage ── */}
      <div
        data-testid="inspector-3d-stage"
        className="rounded-xl bg-surface-900/95 border border-gold-500/30 bg-engei-pattern p-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
              Inspecteur 3D &amp; Boutique ENGEI
            </p>
            <h3 className="text-sm font-bold text-slate-100">{inspectedItem.name}</h3>
            <p className="text-xs text-slate-400">{inspectedItem.description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {(['front', 'dice', 'coin', 'tarot'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setInspectorMode(tab)
                  if (tab === 'front') setInspectorFlipped(false)
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-btn text-[11px] font-semibold border transition-colors cursor-pointer',
                  inspectorMode === tab || (tab === 'front' && inspectorMode === 'back')
                    ? 'bg-gold-500/20 border-gold-400 text-gold-300'
                    : 'bg-surface-800 border-surface-700 text-slate-400 hover:text-slate-200',
                )}
              >
                {tab === 'front' ? 'Carte 3D' : tab === 'dice' ? 'Dé 3D' : tab === 'coin' ? 'Pièce 3D' : 'Tarot'}
              </button>
            ))}
          </div>
        </div>

        {/* 3D Drag-to-Rotate Showcase + Quick Recto/Verso Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Interactive 3D Stage */}
          <div
            data-testid="inspector-3d-viewport"
            onPointerDown={(e) => {
              dragRef.current = { active: true, x: e.clientX, y: e.clientY }
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return
              const dx = e.clientX - dragRef.current.x
              const dy = e.clientY - dragRef.current.y
              dragRef.current = { active: true, x: e.clientX, y: e.clientY }
              setRotY((prev) => Math.max(-55, Math.min(55, prev + dx * 0.7)))
              setRotX((prev) => Math.max(-45, Math.min(45, prev - dy * 0.7)))
            }}
            onPointerUp={() => {
              dragRef.current.active = false
            }}
            onPointerLeave={() => {
              dragRef.current.active = false
            }}
            className="relative min-h-48 rounded-xl bg-black/45 border border-surface-700 flex flex-col items-center justify-center p-4 select-none cursor-grab active:cursor-grabbing overflow-hidden"
          >
            {/* Dynamic foil shimmer overlay driven by rotation */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-30 transition-opacity"
              style={{
                background: `radial-gradient(circle at ${50 + rotY * 0.8}% ${50 - rotX * 0.8}%, rgba(251,191,36,0.38), transparent 60%)`,
              }}
            />

            <div
              data-testid="inspector-3d-object"
              className="relative z-10 transition-transform duration-150 ease-out"
              style={{
                transform: `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {inspectorMode === 'dice' ? (
                <AnimatedDice
                  tens={8}
                  units={4}
                  combinedScore={84}
                  diceThemeId={shownDiceId}
                  rollKey={previewRollKey}
                  size="md"
                />
              ) : inspectorMode === 'coin' ? (
                <AnimatedCoinFlip
                  choice="heads"
                  result={coinFlipResult}
                  coinThemeId={shownCoinId}
                />
              ) : inspectorMode === 'tarot' ? (
                <TarotArcanaCard
                  arcanum={UNDERTALE_TAROT_ARCANA[inspectorTarotIdx] ?? UNDERTALE_TAROT_ARCANA[0]}
                  size="sm"
                  revealed={!inspectorFlipped}
                />
              ) : (
                <ThemedCard
                  suit="hearts"
                  rank={inspectorRank}
                  isHidden={inspectorFlipped}
                  size="lg"
                  frontThemeId={shownFrontId}
                  backThemeId={shownBackId}
                  ariaLabel={inspectorFlipped ? 'Inspecteur 3D Verso' : `Inspecteur 3D ${inspectorRank} de cœur`}
                />
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 z-10">
              <span className="text-[10px] text-slate-400">Glisser pour pivoter en 3D</span>
              <button
                type="button"
                onClick={() => {
                  setRotX(6)
                  setRotY(-10)
                }}
                aria-label="Réinitialiser l'angle 3D"
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-slate-300 hover:border-gold-400 cursor-pointer"
              >
                <RotateCcw className="size-2.5 inline mr-0.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Inspector Controls + Live Recto/Verso Paired Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <ThemedCard
                  suit="hearts"
                  rank={inspectorRank}
                  size="sm"
                  frontThemeId={shownFrontId}
                  backThemeId={shownBackId}
                  ariaLabel="Aperçu Recto (Face)"
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-400">
                  Recto (Face)
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <ThemedCard
                  isHidden
                  size="sm"
                  frontThemeId={shownFrontId}
                  backThemeId={shownBackId}
                  ariaLabel="Aperçu Verso (Dos)"
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-400">
                  Verso (Dos)
                </span>
              </div>
            </div>

            {(inspectorMode === 'front' || inspectorMode === 'back') && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {INSPECTOR_RANKS.map((rk) => (
                  <button
                    key={rk}
                    type="button"
                    onClick={() => {
                      setInspectorMode('front')
                      setInspectorFlipped(false)
                      setInspectorRank(rk)
                    }}
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-bold border cursor-pointer',
                      inspectorRank === rk && !inspectorFlipped
                        ? 'bg-brand-500/20 border-brand-400 text-brand-200'
                        : 'bg-surface-800 border-surface-700 text-slate-400 hover:text-slate-200',
                    )}
                  >
                    {rk === 'A' ? 'As' : rk === 'J' ? 'Valet' : rk === 'Q' ? 'Dame' : rk === 'K' ? 'Roi' : rk}
                  </button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setInspectorFlipped((f) => !f)}
                  leftIcon={<FlipHorizontal2 className="size-3.5" />}
                >
                  Retourner (Recto / Verso)
                </Button>
              </div>
            )}

            {inspectorMode === 'tarot' && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <select
                  aria-label="Choisir une Arcane Majeure à inspecter"
                  value={inspectorTarotIdx}
                  onChange={(e) => setInspectorTarotIdx(Number(e.target.value))}
                  className="px-2 py-1 rounded-btn bg-surface-800 border border-surface-600 text-xs text-slate-100"
                >
                  {UNDERTALE_TAROT_ARCANA.map((arc, idx) => (
                    <option key={arc.number} value={idx}>
                      {arc.roman} — {arc.name} ({arc.arcanaTitle})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setInspectorFlipped((f) => !f)}
                  leftIcon={<FlipHorizontal2 className="size-3.5" />}
                >
                  Retourner
                </Button>
              </div>
            )}

            {(inspectorMode === 'dice' || inspectorMode === 'coin') && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (inspectorMode === 'dice') setPreviewRollKey((k) => k + 1)
                    else setCoinFlipResult((prev) => (prev === 'heads' ? 'tails' : 'heads'))
                  }}
                  leftIcon={<Dices className="size-3.5" />}
                >
                  {inspectorMode === 'dice' ? 'Tester le lancer' : 'Lancer la pièce'}
                </Button>
              </div>
            )}

            {/* Equip / Buy Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-700/80">
              {auth?.profile && (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-gold-300">
                  <Coins className="size-3.5 text-gold-400" />
                  Solde : {formatYen(auth.profile.yen_balance, Boolean(auth.profile.is_admin), true)}
                </span>
              )}

              {inspectedUnlocked ? (
                inspectedItem.category === 'tarot' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <Check className="size-3.5" /> Jeu de Tarot débloqué (Tirage Libre)
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={isInspectedEquipped ? 'secondary' : 'primary'}
                    disabled={saving || isInspectedEquipped}
                    onClick={() => {
                      if (inspectedItem.category === 'front') {
                        void handleSelectFront(inspectedItem.id as StandardCardFrontThemeId, true)
                      } else if (inspectedItem.category === 'back') {
                        void handleSelectBack(inspectedItem.id as CardBackThemeId, true)
                      } else if (inspectedItem.category === 'dice') {
                        void handleSelectDice(inspectedItem.id as DiceThemeId, true)
                      } else if (inspectedItem.category === 'coin') {
                        void handleSelectCoin(inspectedItem.id as CoinThemeId, true)
                      }
                    }}
                    leftIcon={<Check className="size-3.5" />}
                  >
                    {isInspectedEquipped ? 'Équipé ✓' : 'Équiper'}
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isLoading={buyingId === inspectedItem.id}
                  onClick={() => void handlePurchase(inspectedItem)}
                  leftIcon={<ShoppingBag className="size-3.5" />}
                >
                  Acheter ({formatYen(inspectedItem.priceYen)})
                </Button>
              )}
            </div>

            {shopStatus && (
              <p
                role="status"
                className={clsx(
                  'text-xs font-medium px-2.5 py-1.5 rounded-btn border',
                  shopStatus.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300',
                )}
              >
                {shopStatus.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card Front Selector (Standard 52-card decks ONLY — Tarot excluded) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Face des cartes (Jeux de 52 cartes — Recto)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Face des cartes">
          {frontThemes.map((t) => {
            const active = t.id === activeFrontId
            const unlocked = isThemeUnlocked(t.id, t.unlockedByDefault, auth?.profile)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => void handleSelectFront(t.id as StandardCardFrontThemeId, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : `Boutique : ${formatYen(t.priceYen)}`}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
                  active
                    ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
                    : !unlocked
                      ? 'bg-surface-900/50 border-surface-700/80 text-slate-300 hover:border-gold-400/50'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500',
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
                  <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                    <Lock className="size-3" aria-label="Verrouillé" />
                    {formatYen(t.priceYen)}
                  </span>
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
                onClick={() => void handleSelectBack(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : `Boutique : ${formatYen(t.priceYen)}`}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
                  active
                    ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
                    : !unlocked
                      ? 'bg-surface-900/50 border-surface-700/80 text-slate-300 hover:border-gold-400/50'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500',
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
                  <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                    <Lock className="size-3" aria-label="Verrouillé" />
                    {formatYen(t.priceYen)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dice Theme Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Jeu de dés (2d10 &amp; Tirage Libre)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Jeu de dés">
          {diceThemes.map((t) => {
            const active = t.id === activeDiceId
            const unlocked = isThemeUnlocked(t.id, t.unlockedByDefault, auth?.profile)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => void handleSelectDice(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : `Boutique : ${formatYen(t.priceYen)}`}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
                  active
                    ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
                    : !unlocked
                      ? 'bg-surface-900/50 border-surface-700/80 text-slate-300 hover:border-gold-400/50'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500',
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
                  <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                    <Lock className="size-3" aria-label="Verrouillé" />
                    {formatYen(t.priceYen)}
                  </span>
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
                onClick={() => void handleSelectCoin(t.id, unlocked)}
                aria-pressed={active}
                title={unlocked ? t.description : `Boutique : ${formatYen(t.priceYen)}`}
                className={clsx(
                  'flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
                  active
                    ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
                    : !unlocked
                      ? 'bg-surface-900/50 border-surface-700/80 text-slate-300 hover:border-gold-400/50'
                      : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-slate-500',
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
                  <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                    <Lock className="size-3" aria-label="Verrouillé" />
                    {formatYen(t.priceYen)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dedicated Tarot Deck Section (Tarot Only) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Jeu de Tarot Collector (Tirage Libre uniquement)
        </p>
        <button
          type="button"
          onClick={() => setInspectorMode('tarot')}
          className={clsx(
            'w-full flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer',
            inspectorMode === 'tarot'
              ? 'bg-brand-500/15 border-gold-400/70 text-white shadow-sm'
              : 'bg-surface-900/60 border-surface-700 text-slate-300 hover:border-gold-400/50',
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex -space-x-1 shrink-0" aria-hidden="true">
              {UNDERTALE_TAROT_DECK_META.previewSwatches.map((hex, i) => (
                <span
                  key={i}
                  className="size-3 rounded-full border border-white/30"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{UNDERTALE_TAROT_DECK_META.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{UNDERTALE_TAROT_DECK_META.description}</p>
            </div>
          </div>
          {!isThemeUnlocked(
            UNDERTALE_TAROT_DECK_META.id,
            UNDERTALE_TAROT_DECK_META.unlockedByDefault,
            auth?.profile,
          ) && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
              <Lock className="size-3" aria-label="Verrouillé" />
              {formatYen(UNDERTALE_TAROT_DECK_META.priceYen)}
            </span>
          )}
        </button>
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
                  Mes Cartes &amp; Accessoires — Boutique Cercle Engei
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
