import { ArrowLeft, Coins, Moon, Skull, Sparkles, Star, Sun, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { formatYen } from '@/services/wallet/walletService'
import type { Arcane23State } from '../engine/arcane23Engine'

interface GameStatusProps {
  gameState: Arcane23State
  currentUserId?: string
  playerProfiles: Record<string, { displayName: string; isAdmin?: boolean }>
  potYen?: number
  onBackToLobby: () => void
}

export function GameStatus({
  gameState,
  playerProfiles,
  potYen = 0,
  onBackToLobby,
}: GameStatusProps) {
  const { activePersistentArcana, tarotDeck, tarotDiscard, targetRoundsToWin } = gameState
  const [p0, p1] = gameState.playerIds
  const s0 = gameState.playersRecord[p0]?.score ?? 0
  const s1 = gameState.playersRecord[p1]?.score ?? 0
  const name0 = playerProfiles[p0]?.displayName ?? 'Joueur 1'
  const name1 = playerProfiles[p1]?.displayName ?? 'Joueur 2'

  const activeEmperors = Object.entries(activePersistentArcana.emperor).filter(
    ([, eff]) => eff && eff.remainingTurns > 0,
  )
  const activeStars = Object.entries(activePersistentArcana.star).filter(
    ([, eff]) => eff && eff.remainingTurns > 0,
  )

  return (
    <header className="w-full border-b border-gold-500/25 bg-surface-950/85 backdrop-blur-md px-4 py-3">
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
              Premier à{' '}
              <span className="font-bold text-gold-300">{targetRoundsToWin}</span>{' '}
              {targetRoundsToWin === 1 ? 'manche (Mort Subite)' : 'manches'} · Tarot : {tarotDeck.length}/22 (Défausse : {tarotDiscard.length})
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
        </div>
      </div>

      {/* Persistent Corner Effects Banner */}
      {(activePersistentArcana.moon ||
        activePersistentArcana.sun ||
        activePersistentArcana.suddenDeath ||
        activeEmperors.length > 0 ||
        activeStars.length > 0) && (
        <div className="max-w-6xl mx-auto mt-2.5 pt-2 border-t border-surface-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Effets persistants :
          </span>
          {activePersistentArcana.suddenDeath && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 border border-rose-400/50 text-rose-200">
              <Skull className="size-3.5" /> Mort Subite (1 manche)
            </span>
          )}
          {activePersistentArcana.moon && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-400/50 text-indigo-200">
              <Moon className="size-3.5" /> XVIII. La Lune — Issue voilée jusqu’au prochain choix
            </span>
          )}
          {activePersistentArcana.sun && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-400/50 text-amber-200">
              <Sun className="size-3.5" /> XIX. Le Soleil — La plus petite carte gagne
            </span>
          )}
          {activeStars.map(([pid, st]) =>
            st ? (
              <span
                key={`star-${pid}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
              >
                <Star className="size-3.5" /> Étoile ({playerProfiles[pid]?.displayName ?? 'Joueur'} #{st.targetNumber} · {st.remainingTurns}t)
              </span>
            ) : null,
          )}
          {activeEmperors.map(([pid, emp]) =>
            emp ? (
              <span
                key={`emp-${pid}`}
                className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                  emp.mode === 'forbid_tarot'
                    ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                    : 'bg-purple-950/60 border-purple-400/50 text-purple-200',
                )}
              >
                <ShieldAlert className="size-3.5" /> Empereur sur {playerProfiles[pid]?.displayName ?? 'Joueur'} :{' '}
                {emp.mode === 'forbid_tarot' ? 'Tarot interdit' : 'Tarot imposé'} ({emp.remainingTurns}t)
              </span>
            ) : null,
          )}
        </div>
      )}
    </header>
  )
}
