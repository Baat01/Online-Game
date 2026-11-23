import { useState } from 'react'
import { clsx } from 'clsx'
import { UNDERTALE_TAROT_BACK_IMAGE, type TarotArcanum } from '../themes'

export interface TarotArcanaCardProps {
  arcanum: TarotArcanum
  reversed?: boolean
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  revealed?: boolean
  onClick?: () => void
  className?: string
}

const TAROT_SIZE_CLASSES = {
  sm: 'w-28 h-60',
  md: 'w-38 h-82',
  lg: 'w-44 h-96 sm:w-48 sm:h-[26rem]',
}

export function TarotArcanaCard({
  arcanum,
  reversed = false,
  size = 'md',
  selected = false,
  revealed = true,
  onClick,
  className,
}: TarotArcanaCardProps) {
  const [imgError, setImgError] = useState(false)
  const [backImgError, setBackImgError] = useState(false)

  const content = !revealed ? (
    <div className="relative w-full h-full overflow-hidden rounded-xl border-2 border-amber-400/75 bg-[#120d16] shadow-[0_12px_28px_rgba(212,175,55,0.28)]">
      {!backImgError ? (
        <img
          src={UNDERTALE_TAROT_BACK_IMAGE}
          alt="Dos du Tarot Undertale"
          onError={() => setBackImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3">
          <div className="size-12 rounded-full border-2 border-amber-400/70 flex items-center justify-center text-amber-300 font-serif font-bold text-lg bg-black/50">
            ☽
          </div>
          <span className="mt-2 text-[10px] font-serif uppercase tracking-widest text-amber-300/80">
            Arcana ENGEI
          </span>
        </div>
      )}
    </div>
  ) : (
    <div
      className={clsx(
        'relative w-full h-full overflow-hidden rounded-xl border-2 border-amber-400/90 bg-[#0e0b12] shadow-[0_14px_34px_rgba(212,175,55,0.34)]',
        reversed && 'rotate-180',
      )}
    >
      {/* Full-resolution artwork inside ornate obsidian & gold bevel */}
      {!imgError ? (
        <img
          src={arcanum.imagePath}
          alt={`${arcanum.roman} — ${arcanum.name}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain bg-[#f2ead9]"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-stone-950">
          <span className="text-xl font-serif font-bold text-amber-300">{arcanum.roman}</span>
          <span className="text-xs font-serif text-amber-100 mt-1">{arcanum.name}</span>
          <span className="text-[10px] text-amber-400/80 mt-0.5">{arcanum.arcanaTitle}</span>
        </div>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-amber-300/60"
      />
    </div>
  )

  const wrapperClasses = clsx(
    'relative select-none rounded-xl transition-all duration-300 motion-reduce:transition-none',
    TAROT_SIZE_CLASSES[size],
    selected && 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.55)]',
    onClick && 'cursor-pointer hover:-translate-y-1.5',
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-tarot-arcana={arcanum.name}
        data-tarot-reversed={reversed ? 'true' : 'false'}
        aria-label={`${arcanum.roman} — ${arcanum.name}${reversed ? ' (Renversé)' : ''}`}
        className={wrapperClasses}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      data-tarot-arcana={arcanum.name}
      data-tarot-reversed={reversed ? 'true' : 'false'}
      aria-label={`${arcanum.roman} — ${arcanum.name}${reversed ? ' (Renversé)' : ''}`}
      className={wrapperClasses}
    >
      {content}
    </div>
  )
}
