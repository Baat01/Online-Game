import { clsx } from 'clsx'
import { Crown, Sparkles, Clock, Lock, Sun } from 'lucide-react'
import { ThemedCard } from '@/games/_shared/components/ThemedCard'
import { TarotArcanaCard } from '@/games/_shared/components/TarotArcanaCard'
import { AnimatedDice } from '@/games/_shared/components/AnimatedDice'
import { getUndertaleArcanum } from '@/games/_shared/themes/undertaleTarot'
import type { PlayerCardThemeSelection } from '@/games/_shared/useGenericGame'
import {
  getPlayerEffectiveClassicScore,
  getTarotChoiceConstraint,
  type Arcane23PlayerState,
  type Arcane23State,
} from '../engine/arcane23Engine'
import type { InspectedTarotInfo } from './TarotDetailModal'

interface PlayerAreaProps {
  gameState: Arcane23State
  playerState: Arcane23PlayerState
  displayName: string
  avatarUrl?: string | null
  clanTitle?: string | null
  isSelf: boolean
  isWinner: boolean
  themes?: PlayerCardThemeSelection
  onInspectTarot: (info: InspectedTarotInfo) => void
}

export function PlayerArea({
  gameState,
  playerState,
  displayName,
  avatarUrl,
  clanTitle,
  isSelf,
  isWinner,
  themes,
  onInspectTarot,
}: PlayerAreaProps) {
  const isStepRevealing =
    gameState.presentationStep !== 'CHOOSING' && gameState.presentationStep !== 'EMPEROR_CHOICE'
  const isFullyResolved =
    gameState.presentationStep === 'RESOLVED' || gameState.phase === 'FINISHED'
  const hideClassicUnderMoon = gameState.activePersistentArcana.moon && !isFullyResolved

  const constraint = getTarotChoiceConstraint(gameState, playerState.userId)
  const activeScore = getPlayerEffectiveClassicScore(playerState)
  const showTarotCard =
    playerState.drawnTarot !== null && (playerState.tarotRevealed || isFullyResolved)
  const tarotArcanum =
    showTarotCard && playerState.drawnTarot !== null
      ? getUndertaleArcanum(playerState.drawnTarot)
      : null

  const sunRemaining =
    gameState.activePersistentArcana.sun?.revealedCardsRemaining[playerState.userId] ?? 0

  return (
    <div
      data-testid={`arcane23-player-${isSelf ? 'self' : 'opponent'}`}
      className={clsx(
        'rounded-2xl border p-4 transition-all duration-300',
        playerState.drawnTarot === 666 && showTarotCard
          ? 'bg-purple-950/50 border-purple-400 shadow-[0_0_28px_rgba(168,85,247,0.45)]'
          : isWinner
            ? 'bg-gold-500/10 border-gold-400 shadow-[0_0_24px_rgba(250,204,21,0.28)]'
            : isSelf
              ? 'bg-surface-900/90 border-gold-500/35'
              : 'bg-surface-900/75 border-surface-700',
      )}
    >
      {/* Seat header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          {isWinner && <Crown className="size-4 text-gold-400" aria-hidden="true" />}
          <div>
            <p className="text-sm font-bold text-slate-100">
              {displayName}
              {isSelf && <span className="ml-1.5 text-[11px] font-medium text-gold-400">(Vous)</span>}
            </p>
            {clanTitle && <p className="text-[11px] text-slate-400">{clanTitle}</p>}
          </div>
        </div>

        {/* Score crystals (0..target) */}
        <div className="flex items-center gap-1.5" aria-label={`Score : ${playerState.score}`}>
          {Array.from({ length: gameState.targetRoundsToWin }, (_, idx) => (
            <span
              key={idx}
              className={clsx(
                'size-3.5 rounded-full border transition-all',
                idx < playerState.score
                  ? 'bg-gold-400 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.75)]'
                  : 'bg-surface-800 border-surface-600',
              )}
            />
          ))}
          <span className="ml-1 font-mono text-xs font-bold text-gold-300">
            {playerState.score}/{gameState.targetRoundsToWin}
          </span>
        </div>
      </div>

      {/* Deck & Status Pills */}
      <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-slate-300">
        <span className="px-2 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono">
          Paquet 52 : {playerState.classicDeck.length} · Défausse : {playerState.classicDiscard.length}
        </span>

        {playerState.tarotCooldown && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-200">
            <Clock className="size-3" /> Recharge Tarot (1 tour)
          </span>
        )}

        {!constraint.canChooseTarot && !playerState.tarotCooldown && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/35 text-rose-200">
            <Lock className="size-3" /> {constraint.reason}
          </span>
        )}

        {!constraint.canChooseClassic && constraint.reason && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-400/35 text-purple-200">
            <Lock className="size-3" /> {constraint.reason}
          </span>
        )}
      </div>

      {/* XIX. Le Soleil — Reveals ONLY the remaining targeted cards (3 -> 2 -> 1 -> 0) */}
      {sunRemaining > 0 && playerState.classicDeck.length > 0 && (
        <div
          data-testid={`sun-top3-${isSelf ? 'self' : 'opponent'}`}
          className="mt-3 rounded-xl bg-amber-950/30 border border-amber-500/35 p-2 flex flex-wrap items-center gap-2"
        >
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <Sun className="size-3" /> Prochaines {Math.min(sunRemaining, playerState.classicDeck.length)} carte(s) (Le Soleil) :
          </span>
          <div className="flex items-center gap-1.5">
            {playerState.classicDeck.slice(0, sunRemaining).map((card) => (
              <ThemedCard
                key={card.id}
                suit={card.suit}
                rank={card.rank}
                size="sm"
                frontThemeId={themes?.frontThemeId}
                backThemeId={themes?.backThemeId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cards / Choice Display */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 min-h-40">
        {(gameState.presentationStep === 'CHOOSING' ||
          gameState.presentationStep === 'EMPEROR_CHOICE') && (
          <div className="flex flex-col items-center gap-2">
            {playerState.choice ? (
              <>
                <ThemedCard
                  isHidden
                  size="md"
                  frontThemeId={themes?.frontThemeId}
                  backThemeId={themes?.backThemeId}
                  ariaLabel="Choix verrouillé face cachée"
                />
                <span className="text-xs font-semibold text-emerald-300">
                  {isSelf
                    ? `Choix secret : ${playerState.choice === 'tarot' ? 'Tarot' : '52 Cartes'}`
                    : 'Choix verrouillé'}
                </span>
              </>
            ) : (
              <div className="w-24 h-36 rounded-xl border-2 border-dashed border-surface-700 flex flex-col items-center justify-center text-center p-2 text-xs text-slate-500">
                <Sparkles className="size-5 mb-1 opacity-50" />
                {gameState.presentationStep === 'EMPEROR_CHOICE'
                  ? 'Décret de L’Empereur…'
                  : 'En attente du choix…'}
              </div>
            )}
          </div>
        )}

        {isStepRevealing && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {tarotArcanum && playerState.drawnTarot !== null && (
              <div
                className="flex flex-col items-center gap-1 animate-deal-card"
                onClick={(e) => {
                  e.stopPropagation()
                  onInspectTarot({
                    arcanumNumber: playerState.drawnTarot!,
                    playedByName: displayName,
                    playedByAvatarUrl: avatarUrl,
                  })
                }}
              >
                <TarotArcanaCard
                  arcanum={tarotArcanum}
                  size="sm"
                  selected={tarotArcanum.number === 666}
                  onClick={() =>
                    onInspectTarot({
                      arcanumNumber: playerState.drawnTarot!,
                      playedByName: displayName,
                      playedByAvatarUrl: avatarUrl,
                    })
                  }
                />
                <span
                  className={clsx(
                    'text-[11px] font-bold',
                    tarotArcanum.number === 666 ? 'text-purple-300' : 'text-gold-300',
                  )}
                >
                  {tarotArcanum.roman}. {tarotArcanum.name}
                </span>
              </div>
            )}

            {playerState.drawnClassic && (
              <div className="flex flex-col items-center gap-1 animate-deal-card">
                <ThemedCard
                  suit={playerState.drawnClassic.suit}
                  rank={playerState.drawnClassic.rank}
                  isHidden={hideClassicUnderMoon}
                  size="lg"
                  frontThemeId={themes?.frontThemeId}
                  backThemeId={themes?.backThemeId}
                />
                {!hideClassicUnderMoon && !playerState.drawnClassicExtra && activeScore > 0 && (
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Puissance : {activeScore}
                    {playerState.chariotBonus > 0 ? ` (+${playerState.chariotBonus} Chariot)` : ''}
                  </span>
                )}
                {hideClassicUnderMoon && (
                  <span className="text-[11px] text-indigo-300 font-semibold">
                    Face cachée (La Lune)
                  </span>
                )}
              </div>
            )}

            {playerState.drawnClassicExtra && (
              <div className="flex flex-col items-center gap-1 animate-deal-card">
                <ThemedCard
                  suit={playerState.drawnClassicExtra.suit}
                  rank={playerState.drawnClassicExtra.rank}
                  isHidden={hideClassicUnderMoon}
                  size="lg"
                  frontThemeId={themes?.frontThemeId}
                  backThemeId={themes?.backThemeId}
                />
                {!hideClassicUnderMoon && (
                  <span className="text-xs font-mono font-bold text-amber-300">
                    Total L’Amoureux : {activeScore}
                  </span>
                )}
              </div>
            )}

            {playerState.forceJokerSecured && (
              <div className="flex flex-col items-center gap-1 animate-deal-card">
                <ThemedCard
                  suit="spades"
                  rank="JOKER"
                  size="lg"
                  frontThemeId={themes?.frontThemeId}
                  backThemeId={themes?.backThemeId}
                />
                <span className="text-xs font-bold text-amber-300">Joker Invincible</span>
              </div>
            )}

            {playerState.gasterRoll && showTarotCard && (
              <AnimatedDice
                tens={null}
                units={null}
                combinedScore={null}
                tripleD10={playerState.gasterRoll}
                diceThemeId={themes?.diceThemeId}
                rollKey={`${gameState.roundNumber}-${playerState.userId}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
