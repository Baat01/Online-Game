import { X, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TarotArcanaCard } from '@/games/_shared/components/TarotArcanaCard'
import { getUndertaleArcanum } from '@/games/_shared/themes/undertaleTarot'
import { getArcanaRuleSpec } from '../engine/arcane23Engine'

export interface InspectedTarotInfo {
  arcanumNumber: number
  playedByName?: string
  playedByAvatarUrl?: string | null
}

interface TarotDetailModalProps {
  inspected: InspectedTarotInfo | null
  onClose: () => void
}

export function TarotDetailModal({ inspected, onClose }: TarotDetailModalProps) {
  if (!inspected) return null

  const { arcanumNumber, playedByName, playedByAvatarUrl } = inspected
  const arcanum = getUndertaleArcanum(arcanumNumber)
  const spec = getArcanaRuleSpec(arcanumNumber)

  return (
    <div
      data-testid="tarot-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.roman}. ${spec.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface-900 border-2 border-gold-400/60 p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-gold-400" aria-hidden="true" />
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 border border-purple-400/50 text-purple-200">
                {spec.priorityLabel}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-gold-200 mt-1">
              {spec.roman}. {spec.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {playedByName && (
              <div
                data-testid="tarot-modal-played-by-badge"
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-950/90 border border-gold-400/45 shadow-sm"
              >
                {playedByAvatarUrl ? (
                  <img
                    src={playedByAvatarUrl}
                    alt={playedByName}
                    className="size-5 rounded-full object-cover border border-gold-400/60"
                  />
                ) : (
                  <span className="size-5 rounded-full bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
                    <User className="size-3" aria-hidden="true" />
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-200">
                  Joué par <span className="text-gold-300 font-bold">{playedByName}</span>
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fermer la fiche Tarot"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="shrink-0">
            <TarotArcanaCard arcanum={arcanum} size="md" selected={arcanumNumber === 666} />
          </div>
          <div className="space-y-3 text-left">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
                Effet dans Le 23e Arcane
              </p>
              <p className="text-sm text-slate-100 leading-relaxed mt-1">
                {spec.detailedEffect}
              </p>
            </div>
            <div className="pt-2 border-t border-surface-800">
              <p className="text-[11px] text-amber-300/80 italic">
                « {arcanum.meaningUpright} »
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
