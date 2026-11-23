import { describe, expect, test } from 'vitest'
import { createSeededRng } from '../../_shared/randomUtils'
import {
  createInitialState,
  rollDice,
  rollTwoD10,
  combineDice,
  startMatchCoinFlip,
  applyPlayerRoll,
  lockPlayerScore,
  resolveRound,
  checkWinner,
  nextRole,
  triggerTiebreak,
  handleTiebreak,
} from './savingThrowEngine'

const seqRng = (values: number[]) => {
  let idx = 0
  return () => values[idx++ % values.length]
}

describe('Saving Throw Engine', () => {
  test('combineDice handles 00+0=100 and standard combinations', () => {
    expect(combineDice(0, 0)).toBe(100)
    expect(combineDice(0, 1)).toBe(1)
    expect(combineDice(0, 5)).toBe(5)
    expect(combineDice(4, 2)).toBe(42)
    expect(combineDice(9, 9)).toBe(99)
  })

  test('rollDice and rollTwoD10 return valid 0..9 digits deterministically', () => {
    const rng = createSeededRng('saving-throw-seed')
    for (let i = 0; i < 40; i++) {
      const [t, u] = rollDice(rng)
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(9)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(9)
    }
    const [t2, u2] = rollTwoD10(() => 0)
    expect([t2, u2]).toEqual([0, 0])
  })

  test('createInitialState assigns challenger to non-host player', () => {
    const state = createInitialState(['p1', 'p2'], 'p1')
    expect(state.challengerId).toBe('p2')
    expect(state.status).toBe('waiting')
    expect(state.roundNumber).toBe(1)
    expect(state.playersRecord['p1'].wins).toBe(0)
    expect(state.playersRecord['p2'].wins).toBe(0)
  })

  test('startMatchCoinFlip sets first and second roles based on challenger call', () => {
    const base = createInitialState(['p1', 'p2'], 'p1')

    // Heads win for challenger p2
    const p2Starts = startMatchCoinFlip(base, 'heads', () => 0.1)
    expect(p2Starts.coinResult).toBe('heads')
    expect(p2Starts.status).toBe('player_turns')
    expect(p2Starts.currentTurnUserId).toBe('p2')
    expect(p2Starts.playersRecord['p2'].role).toBe('first')
    expect(p2Starts.playersRecord['p1'].role).toBe('second')

    // Tails when challenger called heads -> p1 goes first
    const p1Starts = startMatchCoinFlip(base, 'heads', () => 0.9)
    expect(p1Starts.coinResult).toBe('tails')
    expect(p1Starts.currentTurnUserId).toBe('p1')
    expect(p1Starts.playersRecord['p1'].role).toBe('first')
    expect(p1Starts.playersRecord['p2'].role).toBe('second')
  })

  test('applyPlayerRoll & lockPlayerScore enforce single reroll and turn progression', () => {
    let state = createInitialState(['p1', 'p2'], 'p1')
    state = startMatchCoinFlip(state, 'heads', () => 0.9) // p1 first, p2 second

    // p1 rolls 50 (tens=5, units=0)
    state = applyPlayerRoll(state, 'p1', false, seqRng([0.5, 0.0]))
    expect(state.playersRecord['p1'].hasRolled).toBe(true)
    expect(state.playersRecord['p1'].score).toBe(50)
    expect(state.playersRecord['p1'].finalScore).toBeNull()

    // Duplicate initial roll ignored
    const dupRoll = applyPlayerRoll(state, 'p1', false, seqRng([0.1, 0.1]))
    expect(dupRoll.playersRecord['p1'].score).toBe(50)

    // Wrong player ignored
    expect(applyPlayerRoll(state, 'p2', false, seqRng([0.1, 0.1]))).toBe(state)

    // p1 rerolls -> gets 72 (tens=7, units=2), auto-locks and passes turn to p2
    state = applyPlayerRoll(state, 'p1', true, seqRng([0.7, 0.2]))
    expect(state.playersRecord['p1'].hasRerolled).toBe(true)
    expect(state.playersRecord['p1'].finalScore).toBe(72)
    expect(state.currentTurnUserId).toBe('p2')

    // p2 rolls 34 and keeps -> resolves round, p2 wins (34 < 72)
    state = applyPlayerRoll(state, 'p2', false, seqRng([0.3, 0.4]))
    state = lockPlayerScore(state, 'p2')
    expect(state.status).toBe('result')
    expect(state.roundWinnerId).toBe('p2')
    expect(state.playersRecord['p2'].wins).toBe(1)
  })

  test('resolveRound awards first player when second scores equal or higher', () => {
    const base = createInitialState(['p1', 'p2'], 'p1')
    base.playersRecord['p1'].role = 'first'
    base.playersRecord['p1'].finalScore = 40
    base.playersRecord['p2'].role = 'second'
    base.playersRecord['p2'].finalScore = 40 // equal -> first wins

    const tiedRound = resolveRound(base)
    expect(tiedRound.roundWinnerId).toBe('p1')
    expect(tiedRound.playersRecord['p1'].wins).toBe(1)

    base.playersRecord['p2'].finalScore = 80 // higher -> first wins
    const higherRound = resolveRound(base)
    expect(higherRound.roundWinnerId).toBe('p1')
  })

  test('checkWinner finishes match at 3 wins and activates tiebreaker on tied round 5', () => {
    const state = createInitialState(['p1', 'p2'], 'p1')
    state.playersRecord['p1'].wins = 3
    const finished = checkWinner(state)
    expect(finished.status).toBe('finished')
    expect(finished.gameWinnerId).toBe('p1')

    const tied = createInitialState(['p1', 'p2'], 'p1')
    tied.roundNumber = 5
    tied.playersRecord['p1'].wins = 2
    tied.playersRecord['p2'].wins = 2
    const tieState = checkWinner(tied)
    expect(tieState.tiebreakerActive).toBe(true)
  })

  test('nextRole swaps roles and resets per-round dice state', () => {
    let state = createInitialState(['p1', 'p2'], 'p1')
    state.playersRecord['p1'].role = 'first'
    state.playersRecord['p1'].finalScore = 65
    state.playersRecord['p1'].hasRolled = true
    state.playersRecord['p2'].role = 'second'
    state.playersRecord['p2'].finalScore = 20
    state.playersRecord['p2'].wins = 1

    state = nextRole(state)
    expect(state.roundNumber).toBe(2)
    expect(state.status).toBe('player_turns')
    expect(state.currentTurnUserId).toBe('p2')
    expect(state.playersRecord['p2'].role).toBe('first')
    expect(state.playersRecord['p1'].role).toBe('second')
    expect(state.playersRecord['p1'].finalScore).toBeNull()
    expect(state.playersRecord['p2'].wins).toBe(1)
  })

  test('triggerTiebreak and handleTiebreak decide winner via deterministic coin flip', () => {
    let state = createInitialState(['p1', 'p2'], 'p1')
    state = triggerTiebreak(state)
    expect(state.tiebreakerActive).toBe(true)

    const challengerWins = handleTiebreak(state, 'tails', () => 0.9)
    expect(challengerWins.coinResult).toBe('tails')
    expect(challengerWins.gameWinnerId).toBe('p2')
    expect(challengerWins.status).toBe('finished')
    expect(challengerWins.tiebreakerActive).toBe(false)

    const hostWins = handleTiebreak(state, 'tails', () => 0.1)
    expect(hostWins.coinResult).toBe('heads')
    expect(hostWins.gameWinnerId).toBe('p1')
  })
})
