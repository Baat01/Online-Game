import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Search, Sparkles, Users, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import {
  GAME_RULES,
  getGameRules,
  getOrderedArcanaRules,
  type GameRuleSlug,
} from '../gameRules'

export interface GameRulesModalProps {
  isOpen: boolean
  initialGameSlug?: string | null
  onClose: () => void
}

export function GameRulesModal({ isOpen, initialGameSlug, onClose }: GameRulesModalProps) {
  const [selectedSlug, setSelectedSlug] = useState<GameRuleSlug>(
    getGameRules(initialGameSlug).slug,
  )
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen && initialGameSlug) {
      setSelectedSlug(getGameRules(initialGameSlug).slug)
    }
  }, [isOpen, initialGameSlug])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const activeRule = useMemo(() => getGameRules(selectedSlug), [selectedSlug])
  const allArcana = useMemo(() => getOrderedArcanaRules(), [])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return activeRule.sections
    return activeRule.sections
      .map((sec) => {
        const titleMatches = sec.title.toLowerCase().includes(normalizedQuery)
        const matchingBullets = titleMatches
          ? sec.bullets
          : sec.bullets.filter((b) => b.toLowerCase().includes(normalizedQuery))
        if (matchingBullets.length === 0) return null
        return { ...sec, bullets: matchingBullets }
      })
      .filter((sec): sec is NonNullable<typeof sec> => sec !== null)
  }, [activeRule.sections, normalizedQuery])

  const filteredArcana = useMemo(() => {
    if (!activeRule.includeArcanaIndex) return []
    if (!normalizedQuery) return allArcana
    return allArcana.filter(
      (a) =>
        a.title.toLowerCase().includes(normalizedQuery) ||
        a.roman.toLowerCase().includes(normalizedQuery) ||
        a.priorityLabel.toLowerCase().includes(normalizedQuery) ||
        a.detailedEffect.toLowerCase().includes(normalizedQuery) ||
        String(a.number).includes(normalizedQuery),
    )
  }, [activeRule.includeArcanaIndex, allArcana, normalizedQuery])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Règles du jeu — ${activeRule.name}`}
      data-testid="game-rules-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-surface-900 border-2 border-gold-500/45 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-700 bg-surface-950/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-gold-500/15 border border-gold-400/40 flex items-center justify-center shrink-0">
              <BookOpen className="size-5 text-gold-300" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-gold-200 truncate">
                Règles des Jeux ENGEI 宴芸
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Consultable à tout moment sans quitter la partie
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Fermer les règles"
            onClick={onClose}
            leftIcon={<X className="size-4" />}
          >
            Fermer
          </Button>
        </div>

        {/* Game tabs */}
        <div
          role="tablist"
          aria-label="Choisir un jeu"
          className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-surface-800 bg-surface-900/95"
        >
          {GAME_RULES.map((entry) => {
            const active = entry.slug === activeRule.slug
            return (
              <button
                key={entry.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedSlug(entry.slug)
                  setSearchQuery('')
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border',
                  active
                    ? 'bg-gold-500/20 border-gold-400/60 text-gold-200'
                    : 'bg-surface-800 border-surface-700 text-slate-300 hover:border-slate-500 hover:text-white',
                )}
              >
                {entry.name}
              </button>
            )
          })}
        </div>

        {/* Search filter */}
        <div className="px-5 pt-3 pb-2 bg-surface-900">
          <div className="relative">
            <Search
              className="size-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeRule.includeArcanaIndex
                  ? 'Rechercher une règle, une priorité ou un Arcane (ex: Ermite, Soleil, Gaster)…'
                  : 'Filtrer les règles…'
              }
              aria-label="Rechercher dans les règles"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-gold-400/60"
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 space-y-4">
          {/* Summary header card */}
          <div className="rounded-xl bg-gradient-to-br from-surface-800 to-surface-950 border border-gold-500/25 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-white">{activeRule.name}</h3>
                <p className="text-xs text-slate-400">{activeRule.subtitle}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-900 border border-surface-700 text-xs text-slate-300">
                <Users className="size-3.5 text-gold-400" aria-hidden="true" />
                {activeRule.playersLabel}
              </span>
            </div>
            <p className="text-sm text-gold-200/95 leading-relaxed">
              <strong className="text-gold-300">Objectif :</strong> {activeRule.objective}
            </p>
          </div>

          {/* Rule sections */}
          {filteredSections.map((sec) => (
            <section
              key={sec.title}
              className="rounded-xl bg-surface-800/70 border border-surface-700/80 p-4 space-y-2"
            >
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gold-300">
                {sec.title}
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {sec.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-gold-400 mt-0.5 shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Full 22 Arcana + 666 Gaster index for Le 23e Arcane */}
          {activeRule.includeArcanaIndex && (
            <section className="rounded-xl bg-purple-950/25 border border-purple-400/35 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-purple-200">
                  <Sparkles className="size-3.5 text-gold-300" aria-hidden="true" />
                  Index complet des 22 Arcanes + 666. Gaster ({filteredArcana.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredArcana.map((arc) => (
                  <div
                    key={arc.number}
                    className={clsx(
                      'rounded-xl p-3 border text-xs space-y-1',
                      arc.number === 666
                        ? 'bg-purple-950/60 border-purple-400/60'
                        : 'bg-surface-900/90 border-surface-700/80',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-gold-200">
                        {arc.roman}. {arc.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 border border-purple-400/40 text-purple-200 shrink-0">
                        {arc.priorityLabel}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-snug">{arc.detailedEffect}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {filteredSections.length === 0 && filteredArcana.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-6">
              Aucun résultat pour « {searchQuery} ».
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface GameRulesButtonProps {
  gameSlug?: string | null
  label?: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'secondary'
  className?: string
}

export function GameRulesButton({
  gameSlug,
  label = 'Règles',
  size = 'sm',
  variant = 'secondary',
  className,
}: GameRulesButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        leftIcon={<BookOpen className="size-3.5" aria-hidden="true" />}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {label}
      </Button>
      <GameRulesModal
        isOpen={open}
        initialGameSlug={gameSlug}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
