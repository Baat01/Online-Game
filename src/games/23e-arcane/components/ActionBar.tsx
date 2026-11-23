import { useState } from 'react'
import { Coins, Layers, RefreshCw, Sparkles, Trophy, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemedCard } from '@/games/_shared/components/ThemedCard'
import { AnimatedCoinFlip } from '@/games/_shared/components/AnimatedCoinFlip'
import { getUndertaleArcanum } from '@/games/_shared/themes/undertaleTarot'
import type { PlayerCardThemeSelection } from '@/games/_shared/useGenericGame'
import {
  getTarotChoiceConstraint,
  type Arcane23Prompt,
  type Arcane23PromptResponse,
  type Arcane23State,
  type DrawChoice,
} from '../engine/arcane23Engine'

interface ActionBarProps {
  gameState: Arcane23State
  currentUserId?: string
  isHost: boolean
  isUpdating: boolean
  playerProfiles: Record<string, { displayName: string }>
  themes?: PlayerCardThemeSelection
  onSubmitChoice: (choice: DrawChoice) => void
  onResolvePrompt: (prompt: Arcane23Prompt, response: Arcane23PromptResponse) => void
  onNextRound: () => void
  onRematch: () => void
  onBackToLobby: () => void
}

export function ActionBar({
  gameState,
  currentUserId,
  isHost,
  isUpdating,
  playerProfiles,
  themes,
  onSubmitChoice,
  onResolvePrompt,
  onNextRound,
  onRematch,
  onBackToLobby,
}: ActionBarProps) {
  const [bateleurPickId, setBateleurPickId] = useState<string | null>(null)
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [starNum, setStarNum] = useState<number>(7)

  const myState = currentUserId ? gameState.playersRecord[currentUserId] : undefined
  const activePrompt = gameState.pendingPrompts[0]

  // ── CHOOSING Phase ──
  if (gameState.phase === 'CHOOSING' && myState) {
    const constraint = getTarotChoiceConstraint(gameState, myState.userId)
    if (myState.choice !== null) {
      return (
        <div className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/90 border border-gold-500/30 p-4 text-center">
          <p className="text-sm font-semibold text-gold-300">
            Votre choix secret ({myState.choice === 'tarot' ? 'Tarot' : 'Carte Classique'}) est verrouillé. En attente de votre adversaire…
          </p>
        </div>
      )
    }

    return (
      <div className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/95 border border-gold-500/35 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-bold text-slate-100">
            Manche {gameState.roundNumber} — Choix simultané secret
          </p>
          <p className="text-xs text-slate-400">
            Piochez une carte classique de votre paquet de 52 cartes, ou invoquez l’un des 22 Arcanes du Tarot (test d’anomalie 1/666 avant pioche).
          </p>
          {constraint.reason && (
            <p className="text-xs font-semibold text-amber-300 mt-1">{constraint.reason}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={!constraint.canChooseClassic || isUpdating}
            onClick={() => onSubmitChoice('classic')}
            leftIcon={<Layers className="size-4" />}
          >
            Tirer Carte Classique (52)
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!constraint.canChooseTarot || isUpdating}
            onClick={() => onSubmitChoice('tarot')}
            leftIcon={<Sparkles className="size-4" />}
          >
            Invoquer un Arcane (Tarot)
          </Button>
        </div>
      </div>
    )
  }

  // ── INTERACTION Phase ──
  if (gameState.phase === 'INTERACTION' && activePrompt) {
    const isPromptMine = activePrompt.playerId === currentUserId
    const actorName = playerProfiles[activePrompt.playerId]?.displayName ?? 'Joueur'

    if (!isPromptMine) {
      return (
        <div className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/90 border border-purple-400/35 p-4 text-center">
          <p className="text-sm text-purple-200 font-semibold animate-pulse">
            {actorName} résout une décision d’Arcane ({activePrompt.type.replaceAll('_', ' ')})…
          </p>
        </div>
      )
    }

    return (
      <div className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900 border-2 border-purple-400/60 p-5 space-y-4 shadow-2xl">
        {activePrompt.type === 'GASTER_CHOOSE_WINNER' && (
          <div className="space-y-3 text-center">
            <p className="text-base font-extrabold text-purple-300">
              666. W. D. GASTER — ANOMALIE DU VIDE (1/666)
            </p>
            <p className="text-xs text-slate-300">
              Choisissez quel joueur remporte immédiatement cette manche :
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {activePrompt.candidates.map((cid) => (
                <Button
                  key={cid}
                  type="button"
                  variant="primary"
                  disabled={isUpdating}
                  onClick={() =>
                    onResolvePrompt(activePrompt, {
                      type: 'GASTER_CHOOSE_WINNER',
                      chosenWinnerId: cid,
                    })
                  }
                >
                  Accorder la manche à {playerProfiles[cid]?.displayName ?? cid}
                </Button>
              ))}
            </div>
          </div>
        )}

        {activePrompt.type === 'JUDGMENT_COPY_DISCARD' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-gold-300">
              XX. Le Jugement — Copiez n’importe quel Arcane de la défausse
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {activePrompt.availableArcana.map((num) => {
                const arc = getUndertaleArcanum(num)
                return (
                  <Button
                    key={num}
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isUpdating}
                    onClick={() =>
                      onResolvePrompt(activePrompt, {
                        type: 'JUDGMENT_COPY_DISCARD',
                        targetArcanum: num,
                      })
                    }
                  >
                    {arc.roman}. {arc.name}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {activePrompt.type === 'BATELEUR_PICK_ORDER' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-gold-300">
              I. Le Bateleur — Choisissez 1 carte à jouer parmi vos 3 premières
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {activePrompt.topCards.map((card) => (
                <div key={card.id} className="flex flex-col items-center gap-2">
                  <ThemedCard
                    suit={card.suit}
                    rank={card.rank}
                    size="md"
                    selected={bateleurPickId === card.id}
                    playable
                    frontThemeId={themes?.frontThemeId}
                    backThemeId={themes?.backThemeId}
                    onClick={() => {
                      const remaining = activePrompt.topCards
                        .filter((c) => c.id !== card.id)
                        .map((c) => c.id)
                      setBateleurPickId(card.id)
                      setOrderIds(remaining)
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={bateleurPickId === card.id ? 'primary' : 'secondary'}
                    disabled={isUpdating}
                    onClick={() => {
                      const remaining = activePrompt.topCards
                        .filter((c) => c.id !== card.id)
                        .map((c) => c.id)
                      onResolvePrompt(activePrompt, {
                        type: 'BATELEUR_PICK_ORDER',
                        chosenCardId: card.id,
                        remainingOrder:
                          bateleurPickId === card.id && orderIds.length === remaining.length
                            ? orderIds
                            : remaining,
                      })
                    }}
                  >
                    Jouer cette carte
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePrompt.type === 'PAPESSE_REORDER_OPPONENT' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-gold-300">
              II. La Papesse — Réordonnez les 3 premières cartes du paquet adverse
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {activePrompt.topCards.map((card, i) => (
                <div key={card.id} className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-mono text-purple-300">Position #{i + 1}</span>
                  <ThemedCard
                    suit={card.suit}
                    rank={card.rank}
                    size="md"
                    frontThemeId={themes?.frontThemeId}
                    backThemeId={themes?.backThemeId}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, {
                    type: 'PAPESSE_REORDER_OPPONENT',
                    orderedCardIds: activePrompt.topCards.map((c) => c.id),
                  })
                }
              >
                Conserver cet ordre
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, {
                    type: 'PAPESSE_REORDER_OPPONENT',
                    orderedCardIds: [...activePrompt.topCards].reverse().map((c) => c.id),
                  })
                }
              >
                Inverser l’ordre (3 → 1)
              </Button>
            </div>
          </div>
        )}

        {activePrompt.type === 'ERMITE_DECIDE' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-gold-300">
              IX. L’Ermite — Votre carte secrète : jouez-la ou annulez la manche
            </p>
            <div className="flex justify-center">
              <ThemedCard
                suit={activePrompt.peekedCard.suit}
                rank={activePrompt.peekedCard.rank}
                size="md"
                frontThemeId={themes?.frontThemeId}
                backThemeId={themes?.backThemeId}
              />
            </div>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, { type: 'ERMITE_DECIDE', decision: 'play' })
                }
              >
                Jouer cette carte
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, { type: 'ERMITE_DECIDE', decision: 'cancel' })
                }
              >
                Annuler la manche
              </Button>
            </div>
          </div>
        )}

        {activePrompt.type === 'FORCE_SACRIFICE' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-gold-300">
              XI. La Force — Sacrifier 1 manche gagnée ({activePrompt.currentScore} dispo.) pour forger un Joker imbattable ?
            </p>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, { type: 'FORCE_SACRIFICE', sacrifice: true })
                }
              >
                Sacrifier 1 manche (Joker Imbattable)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, { type: 'FORCE_SACRIFICE', sacrifice: false })
                }
              >
                Conserver mes manches
              </Button>
            </div>
          </div>
        )}

        {activePrompt.type === 'WHEEL_CALL_COIN' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-gold-300">
              X. La Roue de la Fortune — L’adversaire choisit Pile ou Face (+2 manches au vainqueur)
            </p>
            <div className="flex justify-center">
              <AnimatedCoinFlip
                choice="heads"
                result={null}
                coinThemeId={themes?.coinThemeId}
                label="Pièce de la Roue"
              />
            </div>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={isUpdating}
                leftIcon={<Coins className="size-4" />}
                onClick={() =>
                  onResolvePrompt(activePrompt, { type: 'WHEEL_CALL_COIN', call: 'heads' })
                }
              >
                Parier Face
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                leftIcon={<Coins className="size-4" />}
                onClick={() =>
                  onResolvePrompt(activePrompt, { type: 'WHEEL_CALL_COIN', call: 'tails' })
                }
              >
                Parier Pile
              </Button>
            </div>
          </div>
        )}

        {activePrompt.type === 'STAR_PICK_NUMBER' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-cyan-300">
              XVII. L’Étoile — Choisissez un chiffre (2 à 10) pour les 2 prochains tours (+2 manches si vous gagnez avec)
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setStarNum(num)}
                  className={
                    starNum === num
                      ? 'px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm cursor-pointer'
                      : 'px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-600 text-slate-200 font-mono text-sm cursor-pointer'
                  }
                >
                  {num}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              disabled={isUpdating}
              onClick={() =>
                onResolvePrompt(activePrompt, { type: 'STAR_PICK_NUMBER', number: starNum })
              }
            >
              Sceller l’Étoile #{starNum}
            </Button>
          </div>
        )}

        {activePrompt.type === 'EMPEROR_CHOOSE_LOCK' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-amber-300">
              IV. L’Empereur — Décret sur l’adversaire pour les 2 prochains tours
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, {
                    type: 'EMPEROR_CHOOSE_LOCK',
                    mode: 'forbid_tarot',
                  })
                }
              >
                Interdire le Tarot (2 tours)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                onClick={() =>
                  onResolvePrompt(activePrompt, {
                    type: 'EMPEROR_CHOOSE_LOCK',
                    mode: 'force_tarot',
                  })
                }
              >
                Forcer le Tarot (2 tours)
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ROUND_END Phase ──
  if (gameState.phase === 'ROUND_END' && gameState.roundOutcome) {
    const out = gameState.roundOutcome
    const winName = out.winnerId
      ? (playerProfiles[out.winnerId]?.displayName ?? 'Vainqueur')
      : null

    return (
      <div className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/95 border border-gold-500/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {out.hiddenByMoon ? (
            <>
              <p className="text-sm font-bold text-indigo-300">
                Manche {out.roundNumber} voilée par XVIII. La Lune
              </p>
              <p className="text-xs text-slate-400">
                Les cartes et le gagnant seront révélés une fois vos prochains choix validés.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gold-300">
                {winName ? `Manche ${out.roundNumber} remportée par ${winName}` : `Manche ${out.roundNumber} — Match nul`}
              </p>
              <p className="text-xs text-slate-300">{out.reason}</p>
            </>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={isUpdating}
          onClick={onNextRound}
          leftIcon={<RefreshCw className="size-4" />}
        >
          Manche Suivante
        </Button>
      </div>
    )
  }

  // ── FINISHED Phase ──
  if (gameState.phase === 'FINISHED' || gameState.status === 'finished') {
    const champName = gameState.winnerId
      ? (playerProfiles[gameState.winnerId]?.displayName ?? 'Vainqueur')
      : 'Personne'

    return (
      <div className="w-full max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-amber-950/60 via-surface-900 to-purple-950/60 border-2 border-gold-400 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="size-8 text-gold-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-extrabold text-gold-200">
              Victoire de {champName} !
            </h2>
            <p className="text-xs text-slate-300">
              {gameState.roundOutcome?.reason ?? 'Le 23e Arcane a scellé l’issue du duel.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHost && (
            <Button
              type="button"
              variant="primary"
              onClick={onRematch}
              leftIcon={<RotateCcw className="size-4" />}
            >
              Rejouer
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onBackToLobby}>
            Retour à la salle
          </Button>
        </div>
      </div>
    )
  }

  return null
}
