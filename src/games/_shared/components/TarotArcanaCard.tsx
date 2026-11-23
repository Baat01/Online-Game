import { useState } from 'react'
import { clsx } from 'clsx'
import type { TarotArcanum } from '../themes'

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
  sm: 'w-28 h-52',
  md: 'w-40 h-72',
  lg: 'w-48 h-88 sm:w-52 sm:h-96',
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

  const content = !revealed ? (
    <div
      className="w-full h-full rounded-lg border-2 border-amber-400/70 bg-gradient-to-br from-[#141118] via-[#1f1629] to-[#0a0a0e] flex flex-col items-center justify-center p-3"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(212,175,55,0.12) 0px, rgba(212,175,55,0.12) 2px, transparent 2px, transparent 10px)',
      }}
    >
      <div className="size-12 rounded-full border-2 border-amber-400/70 flex items-center justify-center text-amber-300 font-serif font-bold text-lg bg-black/50">
        ☽
      </div>
      <span className="mt-2 text-[10px] font-serif uppercase tracking-widest text-amber-300/80">
        Arcana ENGEI
      </span>
    </div>
  ) : (
    <div
      className={clsx(
        'relative w-full h-full flex flex-col justify-between overflow-hidden rounded-lg border-2 border-amber-400/85 bg-[#0e0b12] p-1 shadow-[0_12px_32px_rgba(212,175,55,0.28)]',
        reversed && 'rotate-180',
      )}
    >
      {/* Top ornate gold bar */}
      <div className="flex items-center justify-between px-1.5 py-0.5 bg-black/75 border-b border-amber-500/40 rounded-t z-10">
        <span className="text-[10px] font-serif font-bold text-amber-300 tracking-widest">
          {arcanum.roman}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-amber-200/80 truncate ml-1">
          {arcanum.arcanaTitle}
        </span>
      </div>

      {/* Center High-Res Undertale Artwork */}
      <div className="relative flex-1 my-0.5 overflow-hidden rounded border border-amber-500/40 bg-stone-950 flex items-center justify-center">
        {!imgError ? (
          <img
            src={arcanum.imagePath}
            alt={`${arcanum.roman} — ${arcanum.name}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <span className="text-xl font-serif font-bold text-amber-300">{arcanum.roman}</span>
            <span className="text-xs font-serif text-amber-100 mt-1">{arcanum.name}</span>
          </div>
        )}
      </div>

      {/* Bottom Title Plate */}
      <div className="px-1.5 py-1 bg-black/80 border-t border-amber-500/40 rounded-b text-center z-10">
        <p className="text-[11px] font-serif font-bold uppercase tracking-wider text-amber-200 truncate leading-tight">
          {arcanum.name}
        </p>
      </div>
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
