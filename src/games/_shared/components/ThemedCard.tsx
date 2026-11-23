import { useState } from 'react'
import { clsx } from 'clsx'
import { useOptionalAuthContext } from '@/contexts/AuthContext'
import type { Rank, Suit } from '../deck'
import {
  getTarotArcanaForCard,
  resolveBackTheme,
  resolveFrontTheme,
  useCardTheme,
  type CardBackThemeId,
  type CardFrontThemeId,
  type CardFrontThemeConfig,
} from '../themes'

export interface ThemedCardProps {
  suit?: Suit
  rank?: Rank | string
  isHidden?: boolean
  size?: 'sm' | 'md' | 'lg'
  playable?: boolean
  disabled?: boolean
  selected?: boolean
  modifierBadge?: string
  seasonLabel?: string
  onClick?: () => void
  frontThemeId?: CardFrontThemeId | string
  backThemeId?: CardBackThemeId | string
  className?: string
  ariaLabel?: string
}

const SIZE_CLASSES = {
  sm: 'w-14 h-20 text-xs rounded-lg p-1.5',
  md: 'w-20 h-28 sm:w-22 sm:h-32 text-sm rounded-xl p-2',
  lg: 'w-24 h-36 sm:w-28 sm:h-40 text-base rounded-xl p-2.5',
}

function SuitGlyph({ suit, className }: { suit: Suit; className?: string }) {
  switch (suit) {
    case 'hearts':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )
    case 'diamonds':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2L20 12L12 22L4 12Z" />
        </svg>
      )
    case 'spades':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2C9 6.5 4 9.5 4 14a4.5 4.5 0 0 0 7.2 3.6L9.5 22h5l-1.7-4.4A4.5 4.5 0 0 0 20 14c0-4.5-5-7.5-8-12z" />
        </svg>
      )
    case 'clubs':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 3a4 4 0 0 0-3.7 5.5A4.2 4.2 0 0 0 4 12.5a4.2 4.2 0 0 0 6.8 3.3L9.5 21h5l-1.3-5.2A4.2 4.2 0 0 0 20 12.5a4.2 4.2 0 0 0-4.3-4A4 4 0 0 0 12 3z" />
        </svg>
      )
  }
}

function CourtBadge({ rank, theme }: { rank: string; theme: CardFrontThemeConfig }) {
  if (!['J', 'Q', 'K', 'A'].includes(rank)) return null
  const label = rank === 'K' ? '👑' : rank === 'Q' ? '✦' : rank === 'J' ? '⚔' : '★'

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none',
        theme.courtBadgeClass,
      )}
    >
      {label}
    </span>
  )
}

export function ThemedCard({
  suit = 'spades',
  rank = 'A',
  isHidden = false,
  size = 'md',
  playable = false,
  disabled = false,
  selected = false,
  modifierBadge,
  seasonLabel,
  onClick,
  frontThemeId,
  backThemeId,
  className,
  ariaLabel,
}: ThemedCardProps) {
  const auth = useOptionalAuthContext()
  const { frontThemeId: storeFrontId, backThemeId: storeBackId } = useCardTheme()
  const [imgError, setImgError] = useState(false)

  const frontTheme = resolveFrontTheme(
    frontThemeId ?? auth?.profile?.card_front_theme ?? storeFrontId,
  )
  const backTheme = resolveBackTheme(
    backThemeId ?? auth?.profile?.card_back_theme ?? storeBackId,
  )

  const isTarot = !isHidden && frontTheme.id === 'undertale-tarot'
  const arcanum = isTarot ? getTarotArcanaForCard(suit, rank) : null

  const isInteractive = Boolean(onClick && playable && !disabled)
  const suitClass = frontTheme.suitColorClass[suit]
  const sizeClass = SIZE_CLASSES[size]

  const baseClasses = clsx(
    'relative select-none border-2 flex flex-col justify-between transition-all duration-200 motion-reduce:transition-none',
    sizeClass,
    isHidden ? backTheme.backContainerClass : frontTheme.faceContainerClass,
    playable && !disabled && frontTheme.playableRingClass,
    isInteractive && 'cursor-pointer hover:-translate-y-2 focus-visible:outline-none',
    selected && '-translate-y-2 ring-2 ring-amber-400',
    disabled && !isHidden && 'opacity-55 saturate-50 cursor-not-allowed',
    className,
  )

  const content = isHidden ? (
    <div
      className="w-full h-full rounded-md border border-white/20 flex items-center justify-center overflow-hidden"
      style={backTheme.backPatternStyle}
    >
      <div
        className={clsx(
          'size-8 rounded-full border border-current/40 flex items-center justify-center bg-black/30 backdrop-blur-[1px] font-bold text-sm',
          backTheme.backEmblemColor,
        )}
      >
        {backTheme.emblemSymbol}
      </div>
    </div>
  ) : isTarot && arcanum ? (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-md border border-amber-400/50 bg-black/40 p-0.5">
      {/* Top bar: corner rank/suit + Roman numeral */}
      <div className="flex items-center justify-between px-1 pt-0.5 z-10">
        <div className={clsx('flex items-center gap-0.5 font-extrabold leading-none', suitClass)}>
          <span className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>{rank}</span>
          <SuitGlyph suit={suit} className={size === 'sm' ? 'size-2.5' : 'size-3'} />
        </div>
        <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-400/50 text-[9px] font-serif font-bold text-amber-200">
          {arcanum.roman}
        </span>
      </div>

      {/* Center Tarot Artwork */}
      <div className="relative flex-1 my-0.5 overflow-hidden rounded border border-amber-500/35 bg-stone-950 flex items-center justify-center">
        {!imgError ? (
          <img
            src={arcanum.imagePath}
            alt={`${arcanum.roman} — ${arcanum.name}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-1 text-center">
            <span className="text-xs font-serif font-bold text-amber-300">{arcanum.roman}</span>
            <SuitGlyph suit={suit} className={clsx('size-5 my-0.5', suitClass)} />
          </div>
        )}
      </div>

      {/* Bottom Arcana Title */}
      <div className="px-1 pb-0.5 text-center z-10">
        <p className="text-[9px] font-serif font-bold uppercase tracking-wider text-amber-200 truncate leading-tight">
          {arcanum.name}
        </p>
        {seasonLabel && (
          <p className="text-[8px] text-amber-400/80 uppercase leading-none">{seasonLabel}</p>
        )}
      </div>

      {modifierBadge && (
        <span
          className={clsx(
            'absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow border z-20',
            modifierBadge.startsWith('-')
              ? 'bg-rose-600 text-white border-rose-300'
              : 'bg-emerald-600 text-white border-emerald-300',
          )}
        >
          {modifierBadge}
        </span>
      )}
    </div>
  ) : (
    <>
      {/* Top corner */}
      <div className={clsx('flex items-start justify-between leading-none font-bold', suitClass)}>
        <div className="flex flex-col items-center">
          <span>{rank}</span>
          <SuitGlyph suit={suit} className={size === 'sm' ? 'size-2.5 mt-0.5' : 'size-3.5 mt-0.5'} />
        </div>
        <CourtBadge rank={String(rank)} theme={frontTheme} />
      </div>

      {/* Center pip */}
      <div className={clsx('flex flex-col items-center justify-center my-auto', suitClass)}>
        <SuitGlyph
          suit={suit}
          className={size === 'sm' ? 'size-5' : size === 'lg' ? 'size-10' : 'size-7'}
        />
        {seasonLabel && (
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-80">
            {seasonLabel}
          </span>
        )}
      </div>

      {/* Bottom corner */}
      <div
        className={clsx(
          'flex items-end justify-between leading-none font-bold rotate-180',
          suitClass,
        )}
      >
        <div className="flex flex-col items-center">
          <span>{rank}</span>
          <SuitGlyph suit={suit} className={size === 'sm' ? 'size-2.5 mt-0.5' : 'size-3.5 mt-0.5'} />
        </div>
      </div>

      {/* Modifier pill (e.g. -3, +3, +10) */}
      {modifierBadge && (
        <span
          className={clsx(
            'absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow border',
            modifierBadge.startsWith('-')
              ? 'bg-rose-600 text-white border-rose-300'
              : 'bg-emerald-600 text-white border-emerald-300',
          )}
        >
          {modifierBadge}
        </span>
      )}
    </>
  )

  const commonDataProps = {
    'data-front-theme': frontTheme.id,
    'data-back-theme': backTheme.id,
    ...(arcanum ? { 'data-tarot-arcana': arcanum.name } : {}),
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={isInteractive ? onClick : undefined}
        disabled={!isInteractive}
        {...commonDataProps}
        aria-label={ariaLabel ?? (isHidden ? 'Hidden card' : `${rank} of ${suit}`)}
        className={baseClasses}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      {...commonDataProps}
      aria-label={ariaLabel ?? (isHidden ? 'Hidden card' : `${rank} of ${suit}`)}
      className={baseClasses}
    >
      {content}
    </div>
  )
}
