import {
  roll2d10,
  combine2d10,
  flipCoin,
  type RngFn,
} from '../../_shared/randomUtils'
import { advanceRound, swapPlayerRoles } from '../../_shared/turnHelpers'
import type { BaseGameState } from '@/types/game'

export interface SavingThrowPlayer {
  userId: string
  score: number
  wins: number
  role: 'first' | 'second' | null
  hasRolled: boolean
  hasRerolled: boolean
  finalScore: number | null
  tensDie: number | null
  unitsDie: number | null
  rollCount: number
}

export interface SavingThrowState extends BaseGameState {
  playersRecord: Record<string, SavingThrowPlayer>
  challengerId: string | null
  coinChoice: 'heads' | 'tails' | null
  coinResult: 'heads' | 'tails' | null
  roundWinnerId: string | null
  gameWinnerId: string | null
  tiebreakerActive: boolean
}

export function rollDice(rng: RngFn = Math.random): [number, number] {
  return roll2d10(rng)
}

export function rollTwoD10(rng: RngFn = Math.random): [number, number] {
  return rollDice(rng)
}

export function combineDice(tens: number, units: number): number {
  return combine2d10(tens, units)
}

export function createInitialState(players: string[], hostId: string): SavingThrowState {
  const playersRecord: Record<string, SavingThrowPlayer> = {}
  for (const id of players) {
    playersRecord[id] = {
      userId: id,
      score: 0,
      wins: 0,
      role: null,
      hasRolled: false,
      hasRerolled: false,
      finalScore: null,
      tensDie: null,
      unitsDie: null,
      rollCount: 0,
    }
  }

  return {
    status: 'waiting',
    players: [],
    currentTurnUserId: null,
    roundNumber: 1,
    playersRecord,
    challengerId: players.find((p) => p !== hostId) ?? players[1] ?? null,
    coinChoice: null,
    coinResult: null,
    roundWinnerId: null,
    gameWinnerId: null,
    tiebreakerActive: false,
  }
}

export function startMatchCoinFlip(
  state: SavingThrowState,
  choice: 'heads' | 'tails',
  rng: RngFn = Math.random,
): SavingThrowState {
  const playerIds = Object.keys(state.playersRecord)
  if (playerIds.length < 2 || !state.challengerId) return state

  const result = flipCoin(rng)
  const otherId = playerIds.find((id) => id !== state.challengerId)!
  const firstId = choice === result ? state.challengerId : otherId
  const secondId = choice === result ? otherId : state.challengerId

  return {
    ...state,
    coinChoice: choice,
    coinResult: result,
    status: 'player_turns',
    currentTurnUserId: firstId,
    playersRecord: {
      ...state.playersRecord,
      [firstId]: { ...state.playersRecord[firstId], role: 'first' },
      [secondId]: { ...state.playersRecord[secondId], role: 'second' },
    },
  }
}

export function applyPlayerRoll(
  state: SavingThrowState,
  userId: string,
  isReroll = false,
  rng: RngFn = Math.random,
): SavingThrowState {
  if (state.status !== 'player_turns' || state.currentTurnUserId !== userId) {
    return state
  }

  const player = state.playersRecord[userId]
  if (!player) return state
  if (!isReroll && player.hasRolled) return state
  if (isReroll && (!player.hasRolled || player.hasRerolled)) return state

  const [tens, units] = rollDice(rng)
  const score = combineDice(tens, units)

  const updatedPlayer: SavingThrowPlayer = {
    ...player,
    hasRolled: true,
    hasRerolled: isReroll ? true : player.hasRerolled,
    tensDie: tens,
    unitsDie: units,
    score,
    finalScore: isReroll ? score : null,
    rollCount: (player.rollCount ?? 0) + 1,
  }

  const nextState: SavingThrowState = {
    ...state,
    playersRecord: {
      ...state.playersRecord,
      [userId]: updatedPlayer,
    },
  }

  // If the player rerolled, they must keep the second result — auto-lock and advance.
  if (isReroll) {
    return advanceAfterLockedScore(nextState, userId)
  }

  return nextState
}

export function lockPlayerScore(state: SavingThrowState, userId: string): SavingThrowState {
  if (state.status !== 'player_turns' || state.currentTurnUserId !== userId) {
    return state
  }

  const player = state.playersRecord[userId]
  if (!player || !player.hasRolled) return state

  const lockedState: SavingThrowState = {
    ...state,
    playersRecord: {
      ...state.playersRecord,
      [userId]: {
        ...player,
        finalScore: player.score,
      },
    },
  }

  return advanceAfterLockedScore(lockedState, userId)
}

function advanceAfterLockedScore(state: SavingThrowState, userId: string): SavingThrowState {
  const player = state.playersRecord[userId]
  if (!player) return state

  if (player.role === 'first') {
    const second = Object.values(state.playersRecord).find((p) => p.role === 'second')
    if (!second) return state
    return {
      ...state,
      currentTurnUserId: second.userId,
    }
  }

  const resolved = resolveRound(state)
  return checkWinner(resolved)
}

export function resolveRound(state: SavingThrowState): SavingThrowState {
  const pList = Object.values(state.playersRecord)
  const first = pList.find((p) => p.role === 'first')
  const second = pList.find((p) => p.role === 'second')

  if (!first || !second) return state
  if (first.finalScore === null || second.finalScore === null) return state

  const secondWins = second.finalScore < first.finalScore
  const roundWinnerId = secondWins ? second.userId : first.userId

  return {
    ...state,
    roundWinnerId,
    status: 'result',
    playersRecord: {
      ...state.playersRecord,
      [first.userId]: {
        ...first,
        wins: secondWins ? first.wins : first.wins + 1,
      },
      [second.userId]: {
        ...second,
        wins: secondWins ? second.wins + 1 : second.wins,
      },
    },
  }
}

export function checkWinner(state: SavingThrowState): SavingThrowState {
  const pList = Object.values(state.playersRecord)
  for (const p of pList) {
    if (p.wins >= 3) {
      return {
        ...state,
        gameWinnerId: p.userId,
        status: 'finished',
        tiebreakerActive: false,
      }
    }
  }

  if (pList.length === 2 && state.roundNumber >= 5 && pList[0].wins === pList[1].wins) {
    return {
      ...state,
      tiebreakerActive: true,
      status: 'result',
    }
  }

  return state
}

export function nextRole(state: SavingThrowState): SavingThrowState {
  const { record, newFirstUserId } = swapPlayerRoles(state.playersRecord)
  if (!newFirstUserId) return state

  const resetRecord: Record<string, SavingThrowPlayer> = {}
  for (const [id, p] of Object.entries(record)) {
    resetRecord[id] = {
      ...p,
      hasRolled: false,
      hasRerolled: false,
      finalScore: null,
      score: 0,
      tensDie: null,
      unitsDie: null,
      rollCount: 0,
    }
  }

  const { roundNumber } = advanceRound(state.roundNumber)

  return {
    ...state,
    status: 'player_turns',
    currentTurnUserId: newFirstUserId,
    playersRecord: resetRecord,
    roundNumber,
    roundWinnerId: null,
  }
}

export function triggerTiebreak(state: SavingThrowState): SavingThrowState {
  return {
    ...state,
    tiebreakerActive: true,
    coinChoice: null,
    coinResult: null,
  }
}

export function handleTiebreak(
  state: SavingThrowState,
  challengerChoice: 'heads' | 'tails',
  rng: RngFn = Math.random,
): SavingThrowState {
  const playerIds = Object.keys(state.playersRecord)
  const challengerId = state.challengerId ?? playerIds[1] ?? playerIds[0]
  const otherId = playerIds.find((id) => id !== challengerId) ?? challengerId

  const result = flipCoin(rng)
  const winnerId = challengerChoice === result ? challengerId : otherId

  return {
    ...state,
    coinChoice: challengerChoice,
    coinResult: result,
    gameWinnerId: winnerId,
    status: 'finished',
    tiebreakerActive: false,
  }
}
