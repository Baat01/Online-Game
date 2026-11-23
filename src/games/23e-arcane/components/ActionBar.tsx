import { useEffect, useState } from 'react'
import {
  Coins,
  Layers,
  RefreshCw,
  Sparkles,
  Trophy,
  RotateCcw,
  EyeOff,
  ArrowRight,
  User,
  ShieldAlert,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemedCard } from '@/games/_shared/components/ThemedCard'
import { TarotArcanaCard } from '@/games/_shared/components/TarotArcanaCard'
import { AnimatedCoinFlip } from '@/games/_shared/components/AnimatedCoinFlip'
import { getUndertaleArcanum } from '@/games/_shared/themes/undertaleTarot'
import type { PlayerCardThemeSelection } from '@/games/_shared/useGenericGame'
import {
  getArcanaRuleSpec,
  getTarotChoiceConstraint,
  type Arcane23Prompt,
  type Arcane23PromptResponse,
  type Arcane23State,
  type DrawChoice,
} from '../engine/arcane23Engine'
import type { InspectedTarotInfo } from './TarotDetailModal'

interface PlayerProfileInfo {
  displayName: string
  avatarUrl?: string | null
}

interface ActionBarProps {
  gameState: Arcane23State
  currentUserId?: string
  isHost: boolean
  isUpdating: boolean
  playerProfiles: Record<string, PlayerProfileInfo>
  playerThemes?: Record<string, PlayerCardThemeSelection>
  themes?: PlayerCardThemeSelection
  onSubmitChoice: (choice: DrawChoice) => void
  onResolvePrompt: (prompt: Arcane23Prompt, response: Arcane23PromptResponse) => void
  onAdvanceStep: () => void
  onInspectTarot: (info: InspectedTarotInfo) => void
  onRematch: () => void
  onBackToLobby: () => void
}

export function ActionBar({
  gameState,
  currentUserId,
  isHost,
  isUpdating,
  playerProfiles,
  playerThemes,
  themes,
  onSubmitChoice,
  onResolvePrompt,
  onAdvanceStep,
  onInspectTarot,
  onRematch,
  onBackToLobby,
}: ActionBarProps) {
  const [bateleurPickId, setBateleurPickId] = useState<string | null>(null)
  const [starNum, setStarNum] = useState<number>(7)
  const [judgmentPreviewId, setJudgmentPreviewId] = useState<number | null>(null)
  const [wheelFlipping, setWheelFlipping] = useState(false)

  const wheelNonce = gameState.pendingWheelFlip?.coinFlipNonce
  useEffect(() => {
    if (!wheelNonce) {
      setWheelFlipping(false)
      return
    }
    setWheelFlipping(true)
    const timer = window.setTimeout(() => {
      setWheelFlipping(false)
    }, 950)
    return () => window.clearTimeout(timer)
  }, [wheelNonce])

  const myState = currentUserId ? gameState.playersRecord[currentUserId] : undefined
  const activePrompt = gameState.pendingPrompts[0]

  // ── EMPEROR_CHOICE Step (Start of each of the next 2 turns after IV. L'Empereur) ──
  if (gameState.presentationStep === 'EMPEROR_CHOICE' && activePrompt?.type === 'EMPEROR_CHOOSE_LOCK') {
    const isMyEmperor = activePrompt.playerId === currentUserId
    const ownerProfile = playerProfiles[activePrompt.playerId]
    const ownerName = ownerProfile?.displayName ?? 'Joueur'
    const oppName = playerProfiles[activePrompt.opponentId]?.displayName ?? 'Adversaire'

    return (
      <div
        data-testid="emperor-choice-stage"
        className="w-full max-w-4xl mx-auto rounded-2xl bg-gradient-to-br from-amber-950/60 via-surface-900 to-surface-950 border-2 border-amber-400/70 p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold text-amber-200">
                Décret de IV. L’Empereur — Manche {gameState.roundNumber}
              </p>
              <p className="text-xs text-slate-300">
                {activePrompt.remainingTurns} tour(s) de décret restant(s) sur {oppName}.
              </p>
            </div>
          </div>
          <div
            data-testid="tarot-played-by-badge"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-950/90 border border-gold-400/50"
          >
            {ownerProfile?.avatarUrl ? (
              <img
                src={ownerProfile.avatarUrl}
                alt={ownerName}
                className="size-5 rounded-full object-cover border border-gold-400/60"
              />
            ) : (
              <span className="size-5 rounded-full bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
                <User className="size-3" aria-hidden="true" />
              </span>
            )}
            <span className="text-xs font-semibold text-slate-200">
              Joué par <span className="text-gold-300 font-bold">{ownerName}</span>
            </span>
          </div>
        </div>

        {!isMyEmperor ? (
          <p className="text-sm text-center text-amber-200 font-semibold animate-pulse py-2">
            En attente du décret de {ownerName} pour cette manche…
          </p>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-slate-100">
              Choisissez la contrainte imposée à <span className="text-amber-300">{oppName}</span> pour ce tour uniquement :
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
                Interdire le Tarot ce tour
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
                Forcer le Tarot ce tour (ignore cooldown)
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── CHOOSING Step ──
  if (gameState.presentationStep === 'CHOOSING' && myState) {
    const constraint = getTarotChoiceConstraint(gameState, myState.userId)
    if (myState.choice !== null) {
      return (
        <div
          className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/90 border border-gold-500/30 p-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-gold-300">
            Votre choix secret ({myState.choice === 'tarot' ? 'Tarot' : 'Carte Classique'}) est verrouillé. En attente de votre adversaire…
          </p>
        </div>
      )
    }

    return (
      <div
        className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/95 border border-gold-500/35 p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        onClick={(e) => e.stopPropagation()}
      >
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

  // ── Étape 1 : Révélation des cartes classiques ──
  if (gameState.presentationStep === 'CLASSIC_REVEAL') {
    return (
      <div
        data-testid="classic-reveal-banner"
        className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/95 border-2 border-gold-400/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
      >
        <div>
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold-500/20 text-gold-300 mb-1">
            Étape 1 — Révélation des cartes classiques
          </span>
          <p className="text-sm text-slate-200">
            {gameState.tarotDrawOrder.length > 0
              ? 'Les cartes classiques sont posées. Le tirage de Tarot s’apprête à apparaître au premier plan.'
              : 'Les deux cartes classiques s’affrontent directement ce tour-ci.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 animate-pulse shrink-0">
          Cliquer n’importe où pour continuer <ArrowRight className="size-4" />
        </span>
      </div>
    )
  }

  // ── Étapes 2 & 3 : Carte de Tarot n° 1 ou n° 2 au premier plan ──
  if (
    gameState.presentationStep === 'TAROT_1' ||
    gameState.presentationStep === 'TAROT_2'
  ) {
    const tarotIdx = gameState.presentationStep === 'TAROT_1' ? 0 : 1
    const actorId = gameState.tarotDrawOrder[tarotIdx]
    const actorRec = actorId ? gameState.playersRecord[actorId] : undefined
    const shownArcNum = actorRec?.effectiveTarot ?? actorRec?.drawnTarot ?? 0
    const arcanum = getUndertaleArcanum(shownArcNum)
    const spec = getArcanaRuleSpec(shownArcNum)
    const actorProfile = actorId ? playerProfiles[actorId] : undefined
    const actorName = actorProfile?.displayName ?? 'Joueur'
    const actorAvatarUrl = actorProfile?.avatarUrl ?? null

    const isPromptMine = activePrompt && activePrompt.playerId === currentUserId
    const promptActorName = activePrompt
      ? (playerProfiles[activePrompt.playerId]?.displayName ?? 'Joueur')
      : actorName

    const previewArcanum =
      judgmentPreviewId !== null ? getUndertaleArcanum(judgmentPreviewId) : null
    const previewSpec = judgmentPreviewId !== null ? getArcanaRuleSpec(judgmentPreviewId) : null

    return (
      <div
        data-testid="tarot-spotlight-stage"
        className="relative w-full max-w-5xl mx-auto rounded-2xl bg-gradient-to-br from-surface-900 via-[#150e24] to-surface-950 border-2 border-purple-400/70 p-5 sm:p-6 shadow-[0_0_40px_rgba(168,85,247,0.28)] space-y-5"
      >
        {/* Top-right Player Identification Badge ("Joué par …" + avatar/icon) */}
        <div
          data-testid="tarot-played-by-badge"
          className="flex justify-end md:absolute md:top-4 md:right-4 z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-950/90 border border-gold-400/55 shadow-lg">
            {actorAvatarUrl ? (
              <img
                src={actorAvatarUrl}
                alt={actorName}
                className="size-6 rounded-full object-cover border border-gold-400/70"
              />
            ) : (
              <span className="size-6 rounded-full bg-gold-500/20 border border-gold-400/55 flex items-center justify-center text-gold-300 font-bold text-xs">
                <User className="size-3.5" aria-hidden="true" />
              </span>
            )}
            <span className="text-xs font-semibold text-slate-200">
              Joué par <span className="text-gold-300 font-extrabold">{actorName}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Large foreground Tarot illustration (clickable) */}
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onInspectTarot({
                arcanumNumber: shownArcNum,
                playedByName: actorName,
                playedByAvatarUrl: actorAvatarUrl,
              })
            }}
          >
            <TarotArcanaCard
              arcanum={arcanum}
              size="lg"
              selected={shownArcNum === 666}
              onClick={() =>
                onInspectTarot({
                  arcanumNumber: shownArcNum,
                  playedByName: actorName,
                  playedByAvatarUrl: actorAvatarUrl,
                })
              }
            />
          </div>

          {/* Priority, Title & Detailed Effect beside the card */}
          <div className="flex-1 space-y-3 text-center md:text-left md:pr-44">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-500/20 border border-gold-400/50 text-gold-200">
                Étape {tarotIdx + 2} — Carte de Tarot n° {tarotIdx + 1}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/25 border border-purple-400/50 text-purple-200">
                {spec.priorityLabel}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              {spec.roman}. {spec.title}
            </h2>

            <p className="text-sm text-slate-200 leading-relaxed bg-black/30 rounded-xl p-3 border border-surface-700/80">
              {spec.detailedEffect}
            </p>

            {/* Interactive Prompt embedded right alongside the spotlighted Tarot card */}
            {activePrompt ? (
              <div
                className="rounded-xl bg-surface-900/95 border border-gold-400/50 p-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {!isPromptMine ? (
                  <p className="text-sm font-semibold text-purple-200 animate-pulse">
                    {activePrompt.type === 'WHEEL_FLIP_COIN'
                      ? `En attente que ${promptActorName} lance la pièce 3D…`
                      : activePrompt.type === 'WHEEL_CALL_COIN'
                        ? `En attente du choix Pile ou Face de ${promptActorName}…`
                        : `En attente de décision de ${promptActorName}…`}
                  </p>
                ) : (
                  <>
                    {activePrompt.type === 'GASTER_CHOOSE_WINNER' && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-extrabold text-purple-300">
                          Anomalie 666 — Désignez le vainqueur immédiat de la partie :
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
                              Victoire pour {playerProfiles[cid]?.displayName ?? cid}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* XX. Le Jugement — 2-Step Selection: Preview first, then Confirm via dedicated button */}
                    {activePrompt.type === 'JUDGMENT_COPY_DISCARD' && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          Sélectionnez un Arcane de la défausse pour lire son effet, puis validez :
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {activePrompt.availableArcana.map((num) => {
                            const arc = getUndertaleArcanum(num)
                            const isSelected = judgmentPreviewId === num
                            return (
                              <Button
                                key={num}
                                type="button"
                                size="sm"
                                variant={isSelected ? 'primary' : 'secondary'}
                                disabled={isUpdating}
                                onClick={() => setJudgmentPreviewId(num)}
                              >
                                {arc.roman}. {arc.name}
                              </Button>
                            )
                          })}
                        </div>

                        {previewArcanum && previewSpec && judgmentPreviewId !== null && (
                          <div
                            data-testid="judgment-preview-panel"
                            className="mt-3 rounded-xl bg-surface-950/90 border border-purple-400/50 p-3 flex flex-col sm:flex-row items-center gap-4 text-left"
                          >
                            <TarotArcanaCard arcanum={previewArcanum} size="sm" />
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-extrabold text-gold-200">
                                  {previewSpec.roman}. {previewSpec.title}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/25 border border-purple-400/40 text-purple-200">
                                  {previewSpec.priorityLabel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 leading-relaxed">
                                {previewSpec.detailedEffect}
                              </p>
                              <div className="pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  data-testid="judgment-confirm-btn"
                                  disabled={isUpdating}
                                  leftIcon={<Check className="size-3.5" />}
                                  onClick={() => {
                                    const chosen = judgmentPreviewId
                                    setJudgmentPreviewId(null)
                                    onResolvePrompt(activePrompt, {
                                      type: 'JUDGMENT_COPY_DISCARD',
                                      targetArcanum: chosen,
                                    })
                                  }}
                                >
                                  Valider et copier cet Arcane
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activePrompt.type === 'BATELEUR_PICK_ORDER' && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          Choisissez 1 carte à jouer parmi vos 3 premières :
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
                                onClick={() => setBateleurPickId(card.id)}
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
                                    remainingOrder: remaining,
                                  })
                                }}
                              >
                                Jouer
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePrompt.type === 'PAPESSE_REORDER_OPPONENT' && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          Réordonnez les 3 premières cartes du paquet adverse :
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                          {activePrompt.topCards.map((card, i) => (
                            <div key={card.id} className="flex flex-col items-center gap-1">
                              <span className="text-[11px] font-mono text-purple-300">#{i + 1}</span>
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

                    {/* IX. L'Ermite — Always allows Play or Cancel, even when opponent chose Tarot */}
                    {activePrompt.type === 'ERMITE_DECIDE' && (
                      <div data-testid="ermite-decision-panel" className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          Observation de IX. L’Ermite :
                        </p>
                        <div className="flex justify-center">
                          {activePrompt.opponentChoseTarot ? (
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-400/50 text-xs text-purple-200">
                              <Sparkles className="size-4" /> L’adversaire a également choisi le Tarot (sa carte classique n’est pas encore tirée).
                            </div>
                          ) : activePrompt.hiddenByMoon ? (
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-950/60 border border-indigo-400/50 text-xs text-indigo-200">
                              <EyeOff className="size-4" /> Masquée par XVIII. La Lune
                            </div>
                          ) : activePrompt.observedOpponentCard ? (
                            <ThemedCard
                              suit={activePrompt.observedOpponentCard.suit}
                              rank={activePrompt.observedOpponentCard.rank}
                              size="md"
                              frontThemeId={themes?.frontThemeId}
                              backThemeId={themes?.backThemeId}
                            />
                          ) : null}
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                          <Button
                            type="button"
                            variant="primary"
                            disabled={isUpdating}
                            onClick={() =>
                              onResolvePrompt(activePrompt, {
                                type: 'ERMITE_DECIDE',
                                decision: 'play',
                              })
                            }
                          >
                            Disputer la manche (piocher ma carte)
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isUpdating}
                            onClick={() =>
                              onResolvePrompt(activePrompt, {
                                type: 'ERMITE_DECIDE',
                                decision: 'cancel',
                              })
                            }
                          >
                            Annuler le tour
                          </Button>
                        </div>
                      </div>
                    )}

                    {activePrompt.type === 'FORCE_SACRIFICE' && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          Votre carte piochée — Sacrifier 1 manche gagnée ({activePrompt.currentScore} dispo.) pour en faire un Joker imbattable ?
                        </p>
                        <div className="flex justify-center">
                          <ThemedCard
                            suit={activePrompt.drawnCard.suit}
                            rank={activePrompt.drawnCard.rank}
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
                              onResolvePrompt(activePrompt, {
                                type: 'FORCE_SACRIFICE',
                                sacrifice: true,
                              })
                            }
                          >
                            Sacrifier 1 manche (Joker Imbattable)
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isUpdating}
                            onClick={() =>
                              onResolvePrompt(activePrompt, {
                                type: 'FORCE_SACRIFICE',
                                sacrifice: false,
                              })
                            }
                          >
                            Jouer normalement
                          </Button>
                        </div>
                      </div>
                    )}

                    {activePrompt.type === 'WHEEL_CALL_COIN' && (
                      <div data-testid="wheel-call-panel" className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          Choisissez Pile ou Face pour la pièce 3D (+2 manches au vainqueur) :
                        </p>
                        <div className="flex justify-center">
                          <AnimatedCoinFlip
                            choice="heads"
                            result={null}
                            coinThemeId={
                              playerThemes?.[activePrompt.ownerId]?.coinThemeId ??
                              themes?.coinThemeId
                            }
                            label="Pièce de la Roue de la Fortune"
                          />
                        </div>
                        <div className="flex justify-center gap-3">
                          <Button
                            type="button"
                            variant="primary"
                            disabled={isUpdating}
                            leftIcon={<Coins className="size-4" />}
                            onClick={() =>
                              onResolvePrompt(activePrompt, {
                                type: 'WHEEL_CALL_COIN',
                                call: 'heads',
                              })
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
                              onResolvePrompt(activePrompt, {
                                type: 'WHEEL_CALL_COIN',
                                call: 'tails',
                              })
                            }
                          >
                            Parier Pile
                          </Button>
                        </div>
                      </div>
                    )}

                    {activePrompt.type === 'WHEEL_FLIP_COIN' && (
                      <div data-testid="wheel-flip-panel" className="space-y-3 text-center">
                        <p className="text-sm font-bold text-gold-300">
                          {playerProfiles[activePrompt.callerId]?.displayName ?? 'Votre adversaire'} a choisi{' '}
                          <span className="uppercase text-amber-200">
                            {activePrompt.call === 'heads' ? 'Face' : 'Pile'}
                          </span>
                          . Lancez la pièce 3D !
                        </p>
                        <div className="flex justify-center">
                          <AnimatedCoinFlip
                            choice={activePrompt.call}
                            result={null}
                            coinThemeId={
                              playerThemes?.[activePrompt.playerId]?.coinThemeId ??
                              themes?.coinThemeId
                            }
                            label="Prête à être lancée"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={isUpdating}
                          leftIcon={<Coins className="size-4" />}
                          onClick={() =>
                            onResolvePrompt(activePrompt, {
                              type: 'WHEEL_FLIP_COIN',
                            })
                          }
                        >
                          Lancer la pièce
                        </Button>
                      </div>
                    )}

                    {activePrompt.type === 'STAR_PICK_NUMBER' && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-bold text-cyan-300">
                          Nommez un chiffre (2 à 10) pour les 2 prochains tours (+2 manches s’il sort) :
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
                            onResolvePrompt(activePrompt, {
                              type: 'STAR_PICK_NUMBER',
                              number: starNum,
                            })
                          }
                        >
                          Sceller l’Étoile #{starNum}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {shownArcNum === 10 && gameState.pendingWheelFlip && (
                  <div
                    data-testid="wheel-coin-3d-result"
                    className="rounded-xl bg-surface-950/90 border-2 border-gold-400/60 p-4 flex flex-col items-center gap-3 text-center shadow-lg"
                  >
                    <AnimatedCoinFlip
                      choice={gameState.pendingWheelFlip.call}
                      result={gameState.pendingWheelFlip.result}
                      flipping={wheelFlipping}
                      flipKey={gameState.pendingWheelFlip.coinFlipNonce}
                      coinThemeId={
                        playerThemes?.[gameState.pendingWheelFlip.ownerId]?.coinThemeId ??
                        themes?.coinThemeId
                      }
                      label="X. La Roue de la Fortune — Lancer de pièce 3D"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-gold-200">
                        Résultat :{' '}
                        <span className="uppercase text-amber-300">
                          {gameState.pendingWheelFlip.result === 'heads' ? 'Face' : 'Pile'}
                        </span>
                      </p>
                      <p className="text-xs font-bold text-emerald-300">
                        Vainqueur du lancer :{' '}
                        {playerProfiles[gameState.pendingWheelFlip.winnerId]?.displayName ??
                          'Joueur'}{' '}
                        (+2 manches)
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center md:justify-end pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 animate-pulse">
                    Cliquer n’importe où pour continuer <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── RESOLVED / ROUND_END Step ──
  if (gameState.phase === 'ROUND_END' && gameState.roundOutcome) {
    const out = gameState.roundOutcome
    const winName = out.winnerId
      ? (playerProfiles[out.winnerId]?.displayName ?? 'Vainqueur')
      : null

    return (
      <div
        className="w-full max-w-4xl mx-auto rounded-2xl bg-surface-900/95 border border-gold-500/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-bold text-gold-300">
            {winName
              ? `Manche ${out.roundNumber} remportée par ${winName}`
              : out.cancelled
                ? `Manche ${out.roundNumber} annulée`
                : `Manche ${out.roundNumber} — Égalité / Double gain`}
          </p>
          <p className="text-xs text-slate-300">{out.reason}</p>
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={isUpdating}
          onClick={onAdvanceStep}
          leftIcon={<RefreshCw className="size-4" />}
        >
          Manche Suivante
        </Button>
      </div>
    )
  }

  // ── FINISHED Step ──
  if (gameState.phase === 'FINISHED' || gameState.status === 'finished') {
    const champName = gameState.winnerId
      ? (playerProfiles[gameState.winnerId]?.displayName ?? 'Vainqueur')
      : 'Personne'

    return (
      <div
        className="w-full max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-amber-950/60 via-surface-900 to-purple-950/60 border-2 border-gold-400 p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Trophy className="size-8 text-gold-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-extrabold text-gold-200">
              Victoire finale de {champName} !
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
