import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Dices, Coins, Layers, Sparkles, Shuffle, RefreshCw, ShoppingBag, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  AnimatedCoinFlip,
  AnimatedDice,
  CardThemeSelector,
  TarotArcanaCard,
  ThemedCard,
} from '@/games/_shared/components'
import { createStandardDeck, shuffleDeck, type Suit } from '@/games/_shared/deck'
import { flipCoin, roll2d10, combine2d10, rollDie } from '@/games/_shared/randomUtils'
import {
  UNDERTALE_TAROT_ARCANA,
  UNDERTALE_TAROT_DECK_META,
  isThemeUnlocked,
  useCardTheme,
  type TarotArcanum,
} from '@/games/_shared/themes'
import { formatYen, purchaseTheme } from '@/services/wallet/walletService'

type QuickDrawTab = 'cards' | 'tarot' | 'dice' | 'coin'
type DieMode = 'd6' | 'd10' | '2d10' | 'd20'

interface DrawnSandboxCard {
  id: string
  suit: Suit
  rank: string
}

interface DrawnTarotEntry {
  arcanum: TarotArcanum
  reversed: boolean
  slotLabel: string
}

function buildSandboxDeck(includeJokers: boolean): DrawnSandboxCard[] {
  const base: DrawnSandboxCard[] = createStandardDeck().map((c) => ({
    id: c.id,
    suit: c.suit,
    rank: c.rank,
  }))
  if (includeJokers) {
    base.push(
      { id: 'joker-red', suit: 'hearts', rank: 'JOKER' },
      { id: 'joker-black', suit: 'spades', rank: 'JOKER' },
    )
  }
  return shuffleDeck(base as never) as unknown as DrawnSandboxCard[]
}

export function QuickDrawPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { frontThemeId, backThemeId, diceThemeId, coinThemeId } = useCardTheme()

  const activeFront = profile?.card_front_theme ?? frontThemeId
  const activeBack = profile?.card_back_theme ?? backThemeId
  const activeDice = profile?.dice_theme ?? diceThemeId
  const activeCoin = profile?.coin_theme ?? coinThemeId

  const [activeTab, setActiveTab] = useState<QuickDrawTab>('cards')

  // ── Tab 1: Standard 54-Card Sandbox ──
  const [includeJokers, setIncludeJokers] = useState(true)
  const [cardDeck, setCardDeck] = useState<DrawnSandboxCard[]>(() => buildSandboxDeck(true))
  const [drawnCards, setDrawnCards] = useState<DrawnSandboxCard[]>([])

  const handleToggleJokers = () => {
    const next = !includeJokers
    setIncludeJokers(next)
    setCardDeck(buildSandboxDeck(next))
    setDrawnCards([])
  }

  const handleDrawCards = (count: number) => {
    setCardDeck((prev) => {
      if (prev.length === 0) return prev
      const picked = prev.slice(0, count)
      const remaining = prev.slice(count)
      setDrawnCards((cur) => [...picked, ...cur])
      return remaining
    })
  }

  const handleReshuffleCards = () => {
    setCardDeck(buildSandboxDeck(includeJokers))
    setDrawnCards([])
  }

  // ── Tab 2: Undertale Tarot (22 Major Arcana) ──
  const tarotUnlocked = useMemo(
    () =>
      isThemeUnlocked(
        UNDERTALE_TAROT_DECK_META.id,
        UNDERTALE_TAROT_DECK_META.unlockedByDefault,
        profile,
      ),
    [profile],
  )
  const [allowReversed, setAllowReversed] = useState(true)
  const [tarotDraws, setTarotDraws] = useState<DrawnTarotEntry[]>([])
  const [buyingTarot, setBuyingTarot] = useState(false)

  const handleDrawTarot = (count: 1 | 3) => {
    const shuffled = [...UNDERTALE_TAROT_ARCANA].sort(() => Math.random() - 0.5)
    const labels = count === 3 ? ['Passé', 'Présent', 'Futur'] : ['Arcane du Destin']
    const picks: DrawnTarotEntry[] = shuffled.slice(0, count).map((arcanum, idx) => ({
      arcanum,
      reversed: allowReversed && Math.random() < 0.35,
      slotLabel: labels[idx] ?? `Carte ${idx + 1}`,
    }))
    setTarotDraws(picks)
  }

  const handleBuyTarot = async () => {
    if (!user?.id) return
    setBuyingTarot(true)
    try {
      await purchaseTheme(user.id, UNDERTALE_TAROT_DECK_META.id)
      await refreshProfile()
      toast('Jeu de Tarot Undertale débloqué !', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Solde insuffisant.', 'error')
    } finally {
      setBuyingTarot(false)
    }
  }

  // ── Tab 3: Dice Roll Sandbox ──
  const [dieMode, setDieMode] = useState<DieMode>('2d10')
  const [rollKey, setRollKey] = useState(0)
  const [dice2d10, setDice2d10] = useState<{ tens: number | null; units: number | null; total: number | null }>({
    tens: 7,
    units: 4,
    total: 74,
  })
  const [singleDieVal, setSingleDieVal] = useState<number | null>(18)
  const [diceHistory, setDiceHistory] = useState<string[]>([])

  const handleRollDice = () => {
    setRollKey((k) => k + 1)
    if (dieMode === '2d10') {
      const [tens, units] = roll2d10()
      const total = combine2d10(tens, units)
      setDice2d10({ tens, units, total })
      setDiceHistory((prev) => [`2d10 → ${total} (${tens}0 + ${units})`, ...prev].slice(0, 6))
    } else {
      const sides = dieMode === 'd6' ? 6 : dieMode === 'd10' ? 10 : 20
      const val = rollDie(sides)
      setSingleDieVal(val)
      setDiceHistory((prev) => [`${dieMode.toUpperCase()} → ${val}`, ...prev].slice(0, 6))
    }
  }

  // ── Tab 4: Coin Flip Sandbox ──
  const [coinCall, setCoinCall] = useState<'heads' | 'tails'>('heads')
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>('heads')
  const [coinSpinning, setCoinSpinning] = useState(false)

  const handleFlipCoin = () => {
    setCoinSpinning(true)
    const res = flipCoin()
    setCoinResult(res)
    window.setTimeout(() => setCoinSpinning(false), 950)
  }

  const tabs: Array<{ id: QuickDrawTab; label: string; icon: typeof Layers }> = [
    { id: 'cards', label: 'Carte Classique (54)', icon: Layers },
    { id: 'tarot', label: 'Tarot Undertale (22)', icon: Sparkles },
    { id: 'dice', label: 'Lancer de Dé', icon: Dices },
    { id: 'coin', label: 'Lancer de Pièce', icon: Coins },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-5 text-gold-400" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-100">
              Tirage Libre — Salon d&apos;Essai ENGEI
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Tirez des cartes, consultez les 22 Arcanes Majeurs du Tarot Undertale ou testez vos dés et pièces en 3D sans créer de salle.
          </p>
        </div>

        <CardThemeSelector mode="modal" />
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Modes de tirage libre">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-semibold border transition-all cursor-pointer',
              activeTab === id
                ? 'bg-brand-500/20 border-gold-400 text-gold-200 shadow-sm'
                : 'bg-surface-800 border-surface-700 text-slate-400 hover:text-slate-100 hover:border-surface-600',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'cards' && (
        <Card className="border-gold-500/30">
          <Card.Body className="space-y-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-700">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <ThemedCard
                    isHidden
                    size="md"
                    frontThemeId={activeFront}
                    backThemeId={activeBack}
                    ariaLabel="Pioche face cachée"
                  />
                  <span className="text-[11px] font-mono text-gold-400">
                    {cardDeck.length} cartes restantes
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={cardDeck.length === 0}
                      onClick={() => handleDrawCards(1)}
                    >
                      Tirer une carte
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={cardDeck.length === 0}
                      onClick={() => handleDrawCards(3)}
                    >
                      Tirer 3 cartes
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleReshuffleCards}
                      leftIcon={<Shuffle className="size-3.5" />}
                    >
                      Mélanger le paquet
                    </Button>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeJokers}
                      onChange={handleToggleJokers}
                      className="rounded border-surface-600"
                    />
                    Inclure les 2 Jokers (54 cartes)
                  </label>
                </div>
              </div>
            </div>

            {drawnCards.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Cliquez sur <strong>Tirer une carte</strong> pour révéler une carte avec vos thèmes actifs.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {drawnCards.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} className="animate-deal-card">
                    <ThemedCard
                      suit={c.suit}
                      rank={c.rank}
                      size="lg"
                      frontThemeId={activeFront}
                      backThemeId={activeBack}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'tarot' && (
        <Card className="border-gold-500/35">
          <Card.Body className="space-y-6 py-6">
            {!tarotUnlocked ? (
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <Lock className="size-8 text-amber-400" aria-hidden="true" />
                <div className="max-w-md space-y-1">
                  <h2 className="text-lg font-bold text-slate-100">
                    {UNDERTALE_TAROT_DECK_META.name}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Débloquez les 22 Arcanes Majeurs illustrés haute définition dans la Boutique ENGEI pour effectuer des tirages Tarot libres.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  isLoading={buyingTarot}
                  onClick={() => void handleBuyTarot()}
                  leftIcon={<ShoppingBag className="size-4" />}
                >
                  Acheter ({formatYen(UNDERTALE_TAROT_DECK_META.priceYen)})
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-700">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="primary" onClick={() => handleDrawTarot(1)}>
                      Tirage 1 Arcane
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleDrawTarot(3)}>
                      Tirage 3 Cartes (Passé · Présent · Futur)
                    </Button>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowReversed}
                      onChange={(e) => setAllowReversed(e.target.checked)}
                      className="rounded border-surface-600"
                    />
                    Autoriser les arcanes renversés
                  </label>
                </div>

                {tarotDraws.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    Lancez un tirage de 1 ou 3 cartes pour consulter les Arcanes Majeurs d&apos;Undertale.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">
                    {tarotDraws.map((entry) => (
                      <div
                        key={`${entry.arcanum.number}-${entry.slotLabel}`}
                        className="flex flex-col items-center gap-3 text-center max-w-xs animate-deal-card"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest text-gold-400">
                          {entry.slotLabel}
                          {entry.reversed ? ' · Renversé' : ''}
                        </span>
                        <TarotArcanaCard
                          arcanum={entry.arcanum}
                          reversed={entry.reversed}
                          size="md"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-100">
                            {entry.arcanum.roman} — {entry.arcanum.name}
                          </p>
                          <p className="text-xs text-amber-300/90 italic">
                            {entry.arcanum.arcanaTitle}
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {entry.reversed
                              ? entry.arcanum.meaningReversed
                              : entry.arcanum.meaningUpright}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'dice' && (
        <Card className="border-gold-500/30">
          <Card.Body className="space-y-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(['d6', 'd10', '2d10', 'd20'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDieMode(m)}
                    className={clsx(
                      'px-3 py-1.5 rounded-btn text-xs font-bold uppercase border cursor-pointer',
                      dieMode === m
                        ? 'bg-brand-500/20 border-gold-400 text-gold-300'
                        : 'bg-surface-900 border-surface-700 text-slate-400 hover:text-slate-100',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleRollDice}
                leftIcon={<RefreshCw className="size-4" />}
              >
                Lancer {dieMode.toUpperCase()}
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center py-6 rounded-xl bg-surface-900/80 border border-surface-700 bg-engei-pattern">
              {dieMode === '2d10' ? (
                <AnimatedDice
                  tens={dice2d10.tens}
                  units={dice2d10.units}
                  combinedScore={dice2d10.total}
                  rollKey={rollKey}
                  diceThemeId={activeDice}
                />
              ) : (
                <AnimatedDice
                  tens={null}
                  units={null}
                  combinedScore={singleDieVal}
                  singleDieLabel={dieMode.toUpperCase()}
                  singleDieValue={singleDieVal}
                  rollKey={rollKey}
                  diceThemeId={activeDice}
                />
              )}
            </div>

            {diceHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Derniers lancers :</span>
                {diceHistory.map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-surface-900 border border-surface-700 text-xs font-mono text-gold-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'coin' && (
        <Card className="border-gold-500/30">
          <Card.Body className="space-y-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCoinCall('heads')}
                  className={clsx(
                    'px-3 py-1.5 rounded-btn text-xs font-bold border cursor-pointer',
                    coinCall === 'heads'
                      ? 'bg-brand-500/20 border-gold-400 text-gold-300'
                      : 'bg-surface-900 border-surface-700 text-slate-400',
                  )}
                >
                  Parier sur Face
                </button>
                <button
                  type="button"
                  onClick={() => setCoinCall('tails')}
                  className={clsx(
                    'px-3 py-1.5 rounded-btn text-xs font-bold border cursor-pointer',
                    coinCall === 'tails'
                      ? 'bg-brand-500/20 border-gold-400 text-gold-300'
                      : 'bg-surface-900 border-surface-700 text-slate-400',
                  )}
                >
                  Parier sur Pile
                </button>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleFlipCoin}
                leftIcon={<Coins className="size-4" />}
              >
                Lancer la pièce 3D
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center py-6 rounded-xl bg-surface-900/80 border border-surface-700 bg-engei-pattern">
              <AnimatedCoinFlip
                choice={coinCall}
                result={coinResult}
                flipping={coinSpinning}
                coinThemeId={activeCoin}
                label="Pièce officielle du Cercle Bami"
              />
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
