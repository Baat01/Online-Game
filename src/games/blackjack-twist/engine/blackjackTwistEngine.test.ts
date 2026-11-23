import { describe, expect, test } from 'vitest'
import { createSeededRng } from '../../_shared/randomUtils'
import {
  createDeck,
  dealHiddenCard,
  dealInitial,
  calculateScore,
  applyCardEffect,
  validateMove,
  drawTurnCard,
  resolvePendingCardChoice,
  standTurn,
  resolveGame,
} from './twistEngine'

describe('Blackjack With Twist Engine', () => {
  test('createDeck produces 52 cards and dealHiddenCard extracts 1 hidden card', () => {
    const deck = createDeck(createSeededRng('twist-1'))
    expect(deck).toHaveLength(52)

    const { hiddenCard, remainingDeck } = dealHiddenCard(deck)
    expect(hiddenCard.isHidden).toBe(true)
    expect(remainingDeck).toHaveLength(51)
    expect(() => dealHiddenCard([])).toThrow()
  })

  test('dealInitial deals hidden shared card and 2 cards per player', () => {
    const state = dealInitial(['p1', 'p2'], 'p1', createSeededRng('twist-deal'))
    expect(state.sharedHiddenCard).not.toBeNull()
    expect(state.sharedHiddenCard?.isHidden).toBe(true)
    expect(state.playersRecord['p1'].hand).toHaveLength(2)
    expect(state.playersRecord['p2'].hand).toHaveLength(2)
    expect(state.deck).toHaveLength(47)
    expect(state.currentTurnUserId).toBe('p1')
  })

  test('calculateScore adjusts multiple Aces and applies shared hidden card only on reveal', () => {
    const hand = [
      { id: 'hearts-A', suit: 'hearts' as const, rank: 'A' as const },
      { id: 'spades-9', suit: 'spades' as const, rank: '9' as const },
    ]
    const shared = { id: 'clubs-5', suit: 'clubs' as const, rank: '5' as const, isHidden: true }

    expect(calculateScore(hand, shared, false)).toBe(20)
    // 11 + 9 + 5 = 25 -> Ace becomes 1 -> 15
    expect(calculateScore(hand, shared, true)).toBe(15)
  })

  test('applyCardEffect handles take (+10) vs give (J=-3, Q=+3, K=+/-3)', () => {
    const base = { userId: 'p2', hand: [], score: 0, hasStood: false, busted: false }

    const takenKing = applyCardEffect({ id: 'hK', suit: 'hearts', rank: 'K' }, 'take', base)
    expect(takenKing.hand[0].currentValue).toBe(10)

    const givenJack = applyCardEffect({ id: 'sJ', suit: 'spades', rank: 'J' }, 'give', base)
    expect(givenJack.hand[0].currentValue).toBe(-3)

    const givenQueen = applyCardEffect({ id: 'dQ', suit: 'diamonds', rank: 'Q' }, 'give', base)
    expect(givenQueen.hand[0].currentValue).toBe(3)

    const givenKingPlus = applyCardEffect({ id: 'cK', suit: 'clubs', rank: 'K' }, 'give', base, '+3')
    expect(givenKingPlus.hand[0].currentValue).toBe(3)

    const givenKingMinus = applyCardEffect({ id: 'hK', suit: 'hearts', rank: 'K' }, 'give', base, '-3')
    expect(givenKingMinus.hand[0].currentValue).toBe(-3)
  })

  test('turn flow: number card draw alternates turns, face card sets pendingCard choice', () => {
    const state = dealInitial(['p1', 'p2'], 'p1', createSeededRng('flow'))
    state.playersRecord['p1'].hand = [{ id: 'h5', suit: 'hearts', rank: '5' }]
    state.playersRecord['p1'].score = 5
    state.playersRecord['p2'].hand = [{ id: 'd8', suit: 'diamonds', rank: '8' }]
    state.playersRecord['p2'].score = 8
    state.deck = [
      { id: 'c4', suit: 'clubs', rank: '4' },
      { id: 'sJ', suit: 'spades', rank: 'J' },
    ]

    expect(validateMove(state, 'p1', 'draw')).toBe(true)
    expect(validateMove(state, 'p2', 'draw')).toBe(false)

    // p1 draws 4 -> score becomes 9, turn alternates to p2
    const afterP1Draw = drawTurnCard(state, 'p1')
    expect(afterP1Draw.playersRecord['p1'].score).toBe(9)
    expect(afterP1Draw.currentTurnUserId).toBe('p2')

    // p2 draws Jack -> pendingCard set, validateMove requires face_choice
    const afterP2Face = drawTurnCard(afterP1Draw, 'p2')
    expect(afterP2Face.pendingCard?.rank).toBe('J')
    expect(validateMove(afterP2Face, 'p2', 'draw')).toBe(false)
    expect(validateMove(afterP2Face, 'p2', 'face_choice')).toBe(true)

    // p2 gives Jack (-3) to p1 -> p1 score becomes 6, turn returns to p1
    const afterGive = resolvePendingCardChoice(afterP2Face, 'p2', 'give')
    expect(afterGive.pendingCard).toBeNull()
    expect(afterGive.playersRecord['p1'].score).toBe(6)
    expect(afterGive.currentTurnUserId).toBe('p1')
  })

  test('standing both players triggers resolveGame and reveals shared hidden card', () => {
    const state = dealInitial(['p1', 'p2'], 'p1', createSeededRng('stand'))
    state.playersRecord['p1'].hand = [{ id: 'h10', suit: 'hearts', rank: '10' }]
    state.playersRecord['p1'].score = 10
    state.playersRecord['p2'].hand = [{ id: 'd9', suit: 'diamonds', rank: '9' }]
    state.playersRecord['p2'].score = 9
    state.sharedHiddenCard = { id: 'cA', suit: 'clubs', rank: 'A', isHidden: true }

    const afterP1Stand = standTurn(state, 'p1')
    expect(afterP1Stand.currentTurnUserId).toBe('p2')
    expect(afterP1Stand.sharedRevealed).toBe(false)

    const afterP2Stand = standTurn(afterP1Stand, 'p2')
    expect(afterP2Stand.status).toBe('result')
    expect(afterP2Stand.sharedRevealed).toBe(true)
    expect(afterP2Stand.winnerId).toBe('p1')
    expect(afterP2Stand.playersRecord['p1'].score).toBe(21)
    expect(afterP2Stand.playersRecord['p2'].score).toBe(20)
  })

  test('resolveGame handles bust and draw edge cases', () => {
    const base = dealInitial(['p1', 'p2'], 'p1', createSeededRng('edge'))
    base.sharedHiddenCard = { id: 'h10', suit: 'hearts', rank: '10', isHidden: true }

    // Both bust -> draw
    base.playersRecord['p1'].hand = [
      { id: 'c10', suit: 'clubs', rank: '10' },
      { id: 'd5', suit: 'diamonds', rank: '5' },
    ]
    base.playersRecord['p2'].hand = [
      { id: 's10', suit: 'spades', rank: '10' },
      { id: 's6', suit: 'spades', rank: '6' },
    ]
    expect(resolveGame(base).winnerId).toBe('draw')

    // Only p1 busts -> p2 wins
    base.playersRecord['p2'].hand = [{ id: 's9', suit: 'spades', rank: '9' }]
    expect(resolveGame(base).winnerId).toBe('p2')

    // Equal non-bust score -> draw
    base.playersRecord['p1'].hand = [{ id: 'c9', suit: 'clubs', rank: '9' }]
    expect(resolveGame(base).winnerId).toBe('draw')
  })
})
