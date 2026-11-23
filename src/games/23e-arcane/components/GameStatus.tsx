import { ArrowLeft, Coins, Eye, Moon, Skull, Sparkles, Star, Sun, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { GameRulesButton } from '@/games/_shared/components'
import { formatYen } from '@/services/wallet/walletService'
import type { Arcane23State } from '../engine/arcane23Engine'
import type { InspectedTarotInfo } from './TarotDetailModal'

interface PlayerProfileSummary {
  displayName: string
  avatarUrl?: string | null
  isAdmin?: boolean
}

interface GameStatusProps {
  gameState: Arcane23State
  currentUserId?: string
  playerProfiles: Record<string, PlayerProfileSummary>
  potYen?: number
  onInspectTarot: (info: InspectedTarotInfo) => void
  onBackToLobby: () => void
}

export function GameStatus({
  gameState,
  playerProfiles,
  potYen = 0,
  onInspectTarot,
  onBackToLobby,
}: GameStatusProps) {
  const { activePersistentArcana, tarotDeck, tarotDiscard, targetRoundsToWin } = gameState
  const [p0, p1] = gameState.playerIds
  const s0 = gameState.playersRecord[p0]?.score ?? 0
  const s1 = gameState.playersRecord[p1]?.score ?? 0
  const name0 = playerProfiles[p0]?.displayName ?? 'Joueur 1'
  const name1 = playerProfiles[p1]?.displayName ?? 'Joueur 2'

  const activeEmperors = Object.entries(activePersistentArcana.emperor).filter(
    ([, eff]) => eff && (eff.remainingTurns > 0 || eff.currentTurnMode !== null),
  )
  const activeStars = Object.entries(activePersistentArcana.star).filter(
    ([, eff]) => eff && eff.remainingTurns > 0,
  )

  const sunTotalRem = activePersistentArcana.sun
    ? Math.max(0, ...Object.values(activePersistentArcana.sun.revealedCardsRemaining))
    : 0

  const buildOwnerInfo = (arcanumNumber: number, ownerId?: string | null): InspectedTarotInfo => {
    const prof = ownerId ? playerProfiles[ownerId] : undefined
    return {
      arcanumNumber,
      playedByName: prof?.displayName,
      playedByAvatarUrl: prof?.avatarUrl ?? null,
    }
  }

  return (
    <header
      className="w-full border-b border-gold-500/25 bg-surface-950/85 backdrop-blur-md px-4 py-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBackToLobby}
            leftIcon={<ArrowLeft className="size-4" />}
          >
            Salle
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-gold-400" aria-hidden="true" />
              <h1 className="text-base sm:text-lg font-bold tracking-wide text-gold-200">
                Le 23e Arcane
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-500/20 border border-purple-400/40 text-purple-200">
                Manche {gameState.roundNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Objectif :{' '}
              <span className="font-bold text-gold-300">
                {activePersistentArcana.suddenDeath ? 'Mort Subite (1 duel)' : `${targetRoundsToWin} manches`}
              </span>{' '}
              · Tarot : {tarotDeck.length}/22 (Défausse : {tarotDiscard.length})
            </p>
          </div>
        </div>

        {/* Score crystals + Yen pot */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-700 text-xs">
            <span className="font-semibold text-slate-200">{name0}</span>
            <span className="font-mono font-extrabold text-gold-300">{s0}</span>
            <span className="text-slate-600">—</span>
            <span className="font-mono font-extrabold text-purple-300">{s1}</span>
            <span className="font-semibold text-slate-200">{name1}</span>
          </div>

          {potYen > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-500/15 border border-gold-400/40 text-xs font-mono font-bold text-gold-300">
              <Coins className="size-3.5" aria-hidden="true" />
              Cagnotte : {formatYen(potYen)}
            </span>
          )}

          <GameRulesButton gameSlug="23e-arcane" />
        </div>
      </div>

      {/* Persistent Corner Effects Banner — Every Tarot badge is clickable */}
      {(activePersistentArcana.moon ||
        (activePersistentArcana.sun && sunTotalRem > 0) ||
        activePersistentArcana.suddenDeath ||
        activePersistentArcana.papesse ||
        activeEmperors.length > 0 ||
        activeStars.length > 0) && (
        <div className="max-w-6xl mx-auto mt-2.5 pt-2 border-t border-surface-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Coin du plateau (cliquer pour détails) :
          </span>
          {activePersistentArcana.suddenDeath && (
            <button
              type="button"
              onClick={() => onInspectTarot({ arcanumNumber: 15 })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 border border-rose-400/50 text-rose-200 hover:bg-rose-500/30 cursor-pointer"
            >
              <Skull className="size-3.5" /> XV. Mort Subite (1 duel)
            </button>
          )}
          {activePersistentArcana.papesse && (
            <button
              type="button"
              onClick={() =>
                onInspectTarot(buildOwnerInfo(2, activePersistentArcana.papesse?.ownerId))
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/30 cursor-pointer"
            >
              <Eye className="size-3.5" /> II. La Papesse ({activePersistentArcana.papesse.remainingDraws} carte(s))
            </button>
          )}
          {activePersistentArcana.moon && (
            <button
              type="button"
              onClick={() =>
                onInspectTarot(buildOwnerInfo(18, activePersistentArcana.moonOwnerId))
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/30 cursor-pointer"
            >
              <Moon className="size-3.5" /> XVIII. La Lune — Cartes face cachée
            </button>
          )}
          {activePersistentArcana.sun && sunTotalRem > 0 && (
            <button
              type="button"
              data-testid="sun-corner-badge"
              onClick={() =>
                onInspectTarot(buildOwnerInfo(19, activePersistentArcana.sun?.ownerId))
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-400/50 text-amber-200 hover:bg-amber-500/30 cursor-pointer"
            >
              <Sun className="size-3.5" /> XIX. Le Soleil — {sunTotalRem} carte(s) révélée(s)
            </button>
          )}
          {activeStars.map(([pid, st]) =>
            st ? (
              <button
                key={`star-${pid}`}
                type="button"
                onClick={() => onInspectTarot(buildOwnerInfo(17, pid))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer"
              >
                <Star className="size-3.5" /> XVII. Étoile ({playerProfiles[pid]?.displayName ?? 'Joueur'} #{st.targetNumber} · {st.remainingTurns}t)
              </button>
            ) : null,
          )}
          {activeEmperors.map(([pid, emp]) =>
            emp ? (
              <button
                key={`emp-${pid}`}
                type="button"
                onClick={() => onInspectTarot(buildOwnerInfo(4, emp.ownerId))}
                className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer',
                  emp.currentTurnMode === 'forbid_tarot'
                    ? 'bg-rose-950/60 border-rose-500/50 text-rose-200 hover:bg-rose-900/60'
                    : 'bg-purple-950/60 border-purple-400/50 text-purple-200 hover:bg-purple-900/60',
                )}
              >
                <ShieldAlert className="size-3.5" /> IV. Empereur sur {playerProfiles[pid]?.displayName ?? 'Joueur'} :{' '}
                {emp.currentTurnMode === 'forbid_tarot'
                  ? 'Tarot interdit ce tour'
                  : emp.currentTurnMode === 'force_tarot'
                    ? 'Tarot imposé ce tour'
                    : `Décret (${emp.remainingTurns} tour(s))`}
              </button>
            ) : null,
          )}
        </div>
      )}
    </header>
  )
}
