import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Moon } from 'lucide-react'
import { ALL_UNDERTALE_TAROT_ARCANA } from '@/games/_shared/themes/undertaleTarot'
import type { PlayerCardThemeSelection } from '@/games/_shared/useGenericGame'
import type { Arcane23State } from '../engine/arcane23Engine'
import { PlayerArea } from './PlayerArea'

interface GameTableProps {
  gameState: Arcane23State
  currentUserId?: string
  playerProfiles: Record<
    string,
    {
      displayName: string
      clanTitle?: string | null
    }
  >
  playerThemes: Record<string, PlayerCardThemeSelection>
}

export function GameTable({
  gameState,
  currentUserId,
  playerProfiles,
  playerThemes,
}: GameTableProps) {
  const [showCodex, setShowCodex] = useState(false)

  const orderedIds = [...gameState.playerIds]
  if (currentUserId && orderedIds.includes(currentUserId)) {
    orderedIds.sort((a, b) => (a === currentUserId ? 1 : b === currentUserId ? -1 : 0))
  }

  const opponentId = orderedIds[0]
  const selfId = orderedIds[1] ?? orderedIds[0]

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Delayed reveal banner from previous Moon round */}
      {gameState.lastRevealedMoonOutcome && (
        <div className="rounded-xl bg-indigo-950/60 border border-indigo-400/50 px-4 py-2.5 flex items-center gap-3 text-xs text-indigo-100">
          <Moon className="size-4 text-indigo-300 shrink-0" />
          <div>
            <span className="font-bold">
              Révélation différée (Manche {gameState.lastRevealedMoonOutcome.roundNumber}) :
            </span>{' '}
            {gameState.lastRevealedMoonOutcome.summary} —{' '}
            {gameState.lastRevealedMoonOutcome.winnerId
              ? `Vainqueur : ${playerProfiles[gameState.lastRevealedMoonOutcome.winnerId]?.displayName ?? gameState.lastRevealedMoonOutcome.winnerId}`
              : 'Match nul'}{' '}
            ({gameState.lastRevealedMoonOutcome.reason})
          </div>
        </div>
      )}

      {/* Arena: Opponent Seat & Self Seat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {opponentId && gameState.playersRecord[opponentId] && (
          <PlayerArea
            gameState={gameState}
            playerState={gameState.playersRecord[opponentId]}
            displayName={playerProfiles[opponentId]?.displayName ?? 'Adversaire'}
            clanTitle={playerProfiles[opponentId]?.clanTitle}
            isSelf={opponentId === currentUserId}
            isWinner={
              gameState.roundOutcome?.winnerId === opponentId && !gameState.roundOutcome.hiddenByMoon
            }
            themes={playerThemes[opponentId]}
          />
        )}

        {selfId && selfId !== opponentId && gameState.playersRecord[selfId] && (
          <PlayerArea
            gameState={gameState}
            playerState={gameState.playersRecord[selfId]}
            displayName={playerProfiles[selfId]?.displayName ?? 'Vous'}
            clanTitle={playerProfiles[selfId]?.clanTitle}
            isSelf={selfId === currentUserId}
            isWinner={
              gameState.roundOutcome?.winnerId === selfId && !gameState.roundOutcome.hiddenByMoon
            }
            themes={playerThemes[selfId]}
          />
        )}
      </div>

      {/* Recent Log + Collapsible Arcana Codex */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-surface-900/75 border border-surface-800 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gold-400 mb-1.5">
            Chronique des Arcanes
          </p>
          <ul className="space-y-1 max-h-28 overflow-y-auto text-xs text-slate-300">
            {gameState.historyLog.slice(0, 6).map((entry, idx) => (
              <li key={idx} className="leading-snug">
                • {entry}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-surface-900/75 border border-surface-800 p-3">
          <button
            type="button"
            onClick={() => setShowCodex((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-300 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" /> Codex du 23e Arcane (0–XXI + 666)
            </span>
            {showCodex ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {showCodex && (
            <div className="mt-2.5 max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              {ALL_UNDERTALE_TAROT_ARCANA.map((arc) => (
                <div
                  key={arc.number}
                  className="px-2 py-1 rounded bg-surface-950/70 border border-surface-800"
                >
                  <span className="font-bold text-gold-300">
                    {arc.roman}. {arc.name}
                  </span>{' '}
                  <span className="text-slate-400">({arc.arcanaTitle})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
