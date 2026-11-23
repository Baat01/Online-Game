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
import { TarotArcanaCard } from './TarotArcanaCard'

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

function CourtCardIllustration({
  rank,
  suit,
  isKinto,
  size,
}: {
  rank: string
  suit: Suit
  isKinto: boolean
  size: 'sm' | 'md' | 'lg'
}) {
  const frameCls = size === 'sm' ? 'w-8 h-10' : size === 'lg' ? 'w-14 h-20' : 'w-11 h-14'
  const accentGold = isKinto ? '#facc15' : '#b45309'
  const coatPrimary = isKinto ? '#18181b' : suit === 'hearts' || suit === 'diamonds' ? '#991b1b' : '#1e293b'
  const coatSecondary = isKinto ? '#eab308' : '#b45309'
  const hasClassicAsset = !isKinto && (rank === 'J' || rank === 'Q' || rank === 'K')
  const assetSrc = hasClassicAsset ? `/themes/classic-courts/${suit}-${rank}.png` : null

  return (
    <div
      data-court-illustration={rank}
      className={clsx(
        'relative flex items-center justify-center rounded-md border overflow-hidden',
        frameCls,
        isKinto
          ? 'border-amber-400/65 bg-stone-950/90'
          : 'border-amber-700/45 bg-white shadow-inner',
      )}
    >
      <svg viewBox="0 0 64 84" className="w-full h-full" aria-hidden="true">
        {/* Decorative royal medallion frame */}
        <rect x="2" y="2" width="60" height="80" rx="5" fill="none" stroke={accentGold} strokeOpacity="0.45" strokeWidth="1.5" />
        <line x1="6" y1="74" x2="58" y2="10" stroke={accentGold} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 2" />

        {rank === 'J' && (
          <>
            {/* Plumed herald cap */}
            <path d="M18 23 Q32 10 46 23 L43 27 H21 Z" fill={coatPrimary} stroke={accentGold} strokeWidth="1.2" />
            <path d="M25 14 Q36 5 49 14" fill="none" stroke={accentGold} strokeWidth="2.2" strokeLinecap="round" />
            {/* Face & armor collar */}
            <circle cx="32" cy="34" r="8" fill="#f3d6b6" stroke="#78350f" strokeWidth="1" />
            <path d="M14 68 L22 44 H42 L50 68 Z" fill={coatPrimary} stroke={accentGold} strokeWidth="1.4" />
            <path d="M22 44 L32 66 L42 44" fill={coatSecondary} fillOpacity="0.85" />
            {/* Halberd weapon */}
            <line x1="52" y1="12" x2="52" y2="74" stroke={accentGold} strokeWidth="2" />
            <path d="M52 13 L59 20 L52 27 Z" fill={accentGold} />
          </>
        )}

        {rank === 'Q' && (
          <>
            {/* Queen Tiara Crown */}
            <path d="M20 25 L24 14 L32 20 L40 14 L44 25 Z" fill={accentGold} stroke="#78350f" strokeWidth="1" />
            <circle cx="32" cy="14" r="2.2" fill="#dc2626" />
            {/* Hair veil & face */}
            <path d="M20 27 Q16 42 20 56 H44 Q48 42 44 27 Z" fill={coatPrimary} fillOpacity="0.85" />
            <circle cx="32" cy="35" r="8" fill="#fde2c8" stroke="#78350f" strokeWidth="1" />
            {/* Brocade gown & rose scepter */}
            <path d="M14 74 L22 46 H42 L50 74 Z" fill={coatPrimary} stroke={accentGold} strokeWidth="1.4" />
            <circle cx="32" cy="59" r="5" fill={accentGold} fillOpacity="0.9" />
            <line x1="13" y1="30" x2="13" y2="72" stroke={accentGold} strokeWidth="1.6" />
            <circle cx="13" cy="28" r="4" fill="#e11d48" stroke={accentGold} strokeWidth="1" />
          </>
        )}

        {rank === 'K' && (
          <>
            {/* Sovereign Imperial Crown */}
            <path d="M18 24 L21 11 L28 19 L32 9 L36 19 L43 11 L46 24 Z" fill={accentGold} stroke="#78350f" strokeWidth="1.2" />
            {/* Face & regal beard */}
            <circle cx="32" cy="33" r="8" fill="#f3d6b6" stroke="#78350f" strokeWidth="1" />
            <path d="M25 36 Q32 45 39 36" fill="#44403c" />
            {/* Mantle & sash */}
            <path d="M12 74 L20 44 H44 L52 74 Z" fill={coatPrimary} stroke={accentGold} strokeWidth="1.6" />
            <path d="M26 44 H38 L36 74 H28 Z" fill={coatSecondary} />
            {/* Ceremonial sword */}
            <line x1="52" y1="16" x2="52" y2="72" stroke="#e2e8f0" strokeWidth="2.2" />
            <line x1="47" y1="54" x2="57" y2="54" stroke={accentGold} strokeWidth="2.2" />
          </>
        )}

        {rank === 'JOKER' && (
          <>
            <path d="M19 30 Q14 14 27 20 Q32 9 37 20 Q50 14 45 30 Z" fill={accentGold} stroke="#991b1b" strokeWidth="1.2" />
            <circle cx="19" cy="18" r="2.5" fill="#dc2626" />
            <circle cx="32" cy="11" r="2.5" fill="#dc2626" />
            <circle cx="45" cy="18" r="2.5" fill="#dc2626" />
            <circle cx="32" cy="39" r="8" fill="#fde68a" />
            <path d="M16 72 L24 49 H40 L48 72 Z" fill="#991b1b" stroke={accentGold} strokeWidth="1.5" />
          </>
        )}

        {/* Small suit emblem at base of portrait */}
        <circle cx="32" cy="74" r="6" fill="#09090b" fillOpacity="0.65" stroke={accentGold} strokeWidth="0.9" />
      </svg>
      {assetSrc && (
        <img
          src={assetSrc}
          alt={`${rank} of ${suit}`}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain bg-white"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
    </div>
  )
}

function CourtBadge({ rank, theme }: { rank: string; theme: CardFrontThemeConfig }) {
  if (!['J', 'Q', 'K', 'A', 'JOKER'].includes(rank)) return null
  const label =
    rank === 'K'
      ? '👑'
      : rank === 'Q'
        ? '✦'
        : rank === 'J'
          ? '⚔'
          : rank === 'JOKER'
            ? '★'
            : theme.id === 'kinto-pay-to-win'
              ? '100¥'
              : '★'

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

  const frontTheme = resolveFrontTheme(
    frontThemeId ?? auth?.profile?.card_front_theme ?? storeFrontId,
  )
  const backTheme = resolveBackTheme(
    backThemeId ?? auth?.profile?.card_back_theme ?? storeBackId,
  )

  const isTarot = !isHidden && frontTheme.id === 'undertale-tarot'
  const arcanum = isTarot ? getTarotArcanaForCard(suit, rank) : null

  if (isTarot && arcanum) {
    return (
      <TarotArcanaCard
        arcanum={arcanum}
        size={size}
        selected={selected}
        onClick={onClick && playable && !disabled ? onClick : undefined}
        className={className}
      />
    )
  }

  const rankStr = String(rank)
  const isCourtCard = ['J', 'Q', 'K', 'JOKER'].includes(rankStr)
  const isKinto = frontTheme.id === 'kinto-pay-to-win'
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
  ) : (
    <>
      {isKinto && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 rounded-lg border border-amber-400/25"
        />
      )}

      {/* Top corner */}
      <div className={clsx('flex items-start justify-between leading-none font-bold relative z-10', suitClass)}>
        <div className="flex flex-col items-center">
          <span>{rankStr === 'JOKER' ? 'J★' : rankStr}</span>
          <SuitGlyph suit={suit} className={size === 'sm' ? 'size-2.5 mt-0.5' : 'size-3.5 mt-0.5'} />
        </div>
        <CourtBadge rank={rankStr} theme={frontTheme} />
      </div>

      {/* Center pip or Illustrated Court Portrait */}
      <div className={clsx('flex flex-col items-center justify-center my-auto relative z-10', suitClass)}>
        {isCourtCard ? (
          <CourtCardIllustration rank={rankStr} suit={suit} isKinto={isKinto} size={size} />
        ) : (
          <SuitGlyph
            suit={suit}
            className={size === 'sm' ? 'size-5' : size === 'lg' ? 'size-10' : 'size-7'}
          />
        )}
        {seasonLabel && (
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-80">
            {seasonLabel}
          </span>
        )}
      </div>

      {/* Bottom corner */}
      <div
        className={clsx(
          'flex items-end justify-between leading-none font-bold rotate-180 relative z-10',
          suitClass,
        )}
      >
        <div className="flex flex-col items-center">
          <span>{rankStr === 'JOKER' ? 'J★' : rankStr}</span>
          <SuitGlyph suit={suit} className={size === 'sm' ? 'size-2.5 mt-0.5' : 'size-3.5 mt-0.5'} />
        </div>
      </div>

      {/* Modifier pill (e.g. -3, +3, +10) */}
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
    </>
  )

  const commonDataProps = {
    'data-front-theme': frontTheme.id,
    'data-back-theme': backTheme.id,
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={isInteractive ? onClick : undefined}
        disabled={!isInteractive}
        {...commonDataProps}
        aria-label={ariaLabel ?? (isHidden ? 'Hidden card' : `${rankStr} of ${suit}`)}
        className={baseClasses}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      {...commonDataProps}
      aria-label={ariaLabel ?? (isHidden ? 'Hidden card' : `${rankStr} of ${suit}`)}
      className={baseClasses}
    >
      {content}
    </div>
  )
}
