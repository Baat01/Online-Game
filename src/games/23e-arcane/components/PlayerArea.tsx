import { clsx } from 'clsx'
import { Crown, Sparkles, Clock, Lock } from 'lucide-react'
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

interface PlayerAreaProps {
  gameState: Arcane23State
  playerState: Arcane23PlayerState
  displayName: string
  clanTitle?: string | null
  isSelf: boolean
  isWinner: boolean
  themes?: PlayerCardThemeSelection
}

export function PlayerArea({
  gameState,
  playerState,
  displayName,
  clanTitle,
  isSelf,
  isWinner,
  themes,
}: PlayerAreaProps) {
  const isRevealed = gameState.phase === 'ROUND_END' || gameState.phase === 'FINISHED' || gameState.phase === 'INTERACTION'
  const veiledByMoon =
    gameState.phase === 'ROUND_END' &&
    Boolean(gameState.roundOutcome?.hiddenByMoon)
  const constraint = getTarotChoiceConstraint(gameState, playerState.userId)
  const activeScore = getPlayerEffectiveClassicScore(playerState)
  const tarotArcanum =
    playerState.drawnTarot !== null ? getUndertaleArcanum(playerState.drawnTarot) : null

  return (
    <div
      data-testid={`arcane23-player-${isSelf ? 'self' : 'opponent'}`}
      className={clsx(
        'rounded-2xl border p-4 transition-all duration-300',
        playerState.drawnTarot === 666
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
      </div>

      {/* Cards / Choice Display */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 min-h-40">
        {gameState.phase === 'CHOOSING' && (
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
                En attente du choix…
              </div>
            )}
          </div>
        )}

        {isRevealed && veiledByMoon && (
          <div className="flex flex-col items-center gap-2">
            <ThemedCard
              isHidden
              size="lg"
              frontThemeId={themes?.frontThemeId}
              backThemeId={themes?.backThemeId}
              ariaLabel="Carte voilée par La Lune"
            />
            <span className="text-xs text-indigo-300 font-semibold">
              Voilé par XVIII. La Lune
            </span>
          </div>
        )}

        {isRevealed && !veiledByMoon && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {tarotArcanum && (
              <div className="flex flex-col items-center gap-1 animate-deal-card">
                <TarotArcanaCard
                  arcanum={tarotArcanum}
                  size="sm"
                  selected={tarotArcanum.number === 666}
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
                  size="lg"
                  frontThemeId={themes?.frontThemeId}
                  backThemeId={themes?.backThemeId}
                />
                {!playerState.drawnClassicExtra && activeScore > 0 && (
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Valeur : {activeScore}
                    {playerState.judgmentBonusPower > 0 ? ` (+${playerState.judgmentBonusPower})` : ''}
                  </span>
                )}
              </div>
            )}

            {playerState.drawnClassicExtra && (
              <div className="flex flex-col items-center gap-1 animate-deal-card">
                <ThemedCard
                  suit={playerState.drawnClassicExtra.suit}
                  rank={playerState.drawnClassicExtra.rank}
                  size="lg"
                  frontThemeId={themes?.frontThemeId}
                  backThemeId={themes?.backThemeId}
                />
                <span className="text-xs font-mono font-bold text-amber-300">
                  Total : {activeScore} {playerState.bustedDiable ? '(BUST > 21)' : ''}
                </span>
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

            {playerState.gasterRoll && (
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
