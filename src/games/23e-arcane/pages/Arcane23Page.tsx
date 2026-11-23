import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isLocalDemoMode } from '@/lib/supabase'
import { DEMO_GUEST_ID } from '@/lib/localSupabase'
import { useGenericGame } from '../../_shared/useGenericGame'
import {
  advancePresentationStep,
  buildDefaultPromptResponse,
  canPlayerChooseTarot,
  createInitialArcane23State,
  resolveArcanePrompt,
  submitDrawChoice,
  type Arcane23Prompt,
  type Arcane23PromptResponse,
  type Arcane23State,
  type DrawChoice,
} from '../engine/arcane23Engine'
import { GameStatus } from '../components/GameStatus'
import { GameTable } from '../components/GameTable'
import { ActionBar } from '../components/ActionBar'
import { TarotDetailModal, type InspectedTarotInfo } from '../components/TarotDetailModal'

export function Arcane23Page() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [inspectedTarot, setInspectedTarot] = useState<InspectedTarotInfo | null>(null)

  const createInitial = useCallback(
    (players: string[], hostId: string) => createInitialArcane23State(players, hostId),
    [],
  )

  const {
    gameState,
    isHost,
    playerProfiles,
    playerThemes,
    roomPotYen,
    updateGameState,
    emitEvent,
    isUpdating,
    resetMatch,
  } = useGenericGame<Arcane23State>(roomId ?? '', {
    gameSlug: '23e-arcane',
    createInitialState: createInitial,
  })

  useEffect(() => {
    if (!roomId) {
      navigate('/games', { replace: true })
    }
  }, [roomId, navigate])

  // Automated Demo Guest AI response in Local Demo solo rooms so a solo host can play full matches seamlessly
  useEffect(() => {
    if (!isLocalDemoMode || !isHost || !gameState || isUpdating) return
    const guest = gameState.playersRecord[DEMO_GUEST_ID]
    if (!guest) return

    let timer: number | undefined
    if (gameState.presentationStep === 'CHOOSING' && guest.choice === null) {
      const hostRec = gameState.playersRecord[user?.id ?? '']
      if (hostRec?.choice !== null) {
        timer = window.setTimeout(() => {
          const allowTarot = canPlayerChooseTarot(gameState, DEMO_GUEST_ID)
          const emp = gameState.activePersistentArcana.emperor[DEMO_GUEST_ID]
          const aiChoice: DrawChoice =
            emp?.currentTurnMode === 'force_tarot'
              ? 'tarot'
              : allowTarot && Math.random() < 0.35
                ? 'tarot'
                : 'classic'
          const next = submitDrawChoice(gameState, DEMO_GUEST_ID, aiChoice)
          void updateGameState({ ...next, markRoomFinished: next.status === 'finished' })
        }, 450)
      }
    } else if (
      gameState.phase === 'INTERACTION' &&
      gameState.pendingPrompts[0]?.playerId === DEMO_GUEST_ID
    ) {
      const prompt = gameState.pendingPrompts[0]
      timer = window.setTimeout(() => {
        const next = resolveArcanePrompt(
          gameState,
          DEMO_GUEST_ID,
          buildDefaultPromptResponse(prompt),
        )
        void updateGameState({ ...next, markRoomFinished: next.status === 'finished' })
      }, 450)
    }

    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [gameState, isHost, isUpdating, user?.id, updateGameState])

  if (!roomId) return null

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-950 text-white">
        <p className="text-slate-400 animate-pulse">
          Préparation des 22 Arcanes et des paquets de 52 cartes…
        </p>
      </div>
    )
  }

  const handleChoice = async (choice: DrawChoice) => {
    if (!user) return
    const nextState = submitDrawChoice(gameState, user.id, choice)
    const finished = nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'state_updated',
      payload: { action: 'choose', userId: user.id, choice, phase: nextState.phase },
    })
  }

  const handleResolvePrompt = async (
    _prompt: Arcane23Prompt,
    response: Arcane23PromptResponse,
  ) => {
    if (!user) return
    const nextState = resolveArcanePrompt(gameState, user.id, response)
    const finished = nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'state_updated',
      payload: { action: 'prompt_resolved', userId: user.id, promptType: response.type },
    })
  }

  const handleAdvanceStep = async () => {
    if (isUpdating || gameState.pendingPrompts.length > 0) return
    if (
      gameState.presentationStep === 'CHOOSING' ||
      gameState.presentationStep === 'EMPEROR_CHOICE' ||
      gameState.phase === 'FINISHED'
    ) {
      return
    }
    const nextState = advancePresentationStep(gameState)
    const finished = nextState.status === 'finished'
    await updateGameState({ ...nextState, markRoomFinished: finished })
    await emitEvent({
      type: finished ? 'game_finished' : 'turn_changed',
      payload: {
        action: 'advance_step',
        presentationStep: nextState.presentationStep,
        roundNumber: nextState.roundNumber,
      },
    })
  }

  const canClickAnywhereToContinue =
    inspectedTarot === null &&
    gameState.pendingPrompts.length === 0 &&
    (gameState.presentationStep === 'CLASSIC_REVEAL' ||
      gameState.presentationStep === 'TAROT_1' ||
      gameState.presentationStep === 'TAROT_2')

  const selfThemes = user ? playerThemes[user.id] : undefined

  return (
    <div
      data-testid="click-anywhere-continue"
      onClick={() => {
        if (canClickAnywhereToContinue) {
          void handleAdvanceStep()
        }
      }}
      className={
        canClickAnywhereToContinue
          ? 'flex flex-col min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-950/70 via-slate-950 to-black text-white pb-6 cursor-pointer'
          : 'flex flex-col min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-950/70 via-slate-950 to-black text-white pb-6'
      }
    >
      <GameStatus
        gameState={gameState}
        currentUserId={user?.id}
        playerProfiles={playerProfiles}
        potYen={roomPotYen}
        onInspectTarot={(info) => setInspectedTarot(info)}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />

      <div className="px-4 pt-4">
        <ActionBar
          gameState={gameState}
          currentUserId={user?.id}
          isHost={isHost}
          isUpdating={isUpdating}
          playerProfiles={playerProfiles}
          themes={selfThemes}
          onSubmitChoice={(c) => void handleChoice(c)}
          onResolvePrompt={(p, r) => void handleResolvePrompt(p, r)}
          onAdvanceStep={() => void handleAdvanceStep()}
          onInspectTarot={(info) => setInspectedTarot(info)}
          onRematch={() => void resetMatch()}
          onBackToLobby={() => navigate(`/room/${roomId}`)}
        />
      </div>

      <GameTable
        gameState={gameState}
        currentUserId={user?.id}
        playerProfiles={playerProfiles}
        playerThemes={playerThemes}
        onInspectTarot={(info) => setInspectedTarot(info)}
      />

      <TarotDetailModal
        inspected={inspectedTarot}
        onClose={() => setInspectedTarot(null)}
      />
    </div>
  )
}
