import { describe, expect, test } from 'vitest'
import { createSeededRng } from '../../_shared/randomUtils'
import type { Card } from '../../_shared/deck'
import {
  dealInitialHands,
  getNextSeason,
  canPlayCard,
  validateMove,
  applyEffect,
  checkWinCondition,
  playCard,
  drawCard,
} from './fourSeasonsEngine'

describe('Four Seasons Engine', () => {
  test('dealInitialHands deals 4 cards per player and 1 starter discard', () => {
    const state = dealInitialHands(['p1', 'p2'], 'p1', createSeededRng('fs-deal'))
    expect(state.playersRecord['p1'].hand).toHaveLength(4)
    expect(state.playersRecord['p2'].hand).toHaveLength(4)
    expect(state.discardPile).toHaveLength(1)
    expect(state.deck).toHaveLength(43)
    expect(state.activeSeason).toBe(state.discardPile[0].suit)
  })

  test('canPlayCard enforces STRICT next-season rule, King override, and face-card finish ban', () => {
    expect(getNextSeason('hearts')).toBe('diamonds')
    expect(getNextSeason('diamonds')).toBe('spades')
    expect(getNextSeason('spades')).toBe('clubs')
    expect(getNextSeason('clubs')).toBe('hearts')

    // Spring (hearts) active -> ONLY Summer (diamonds) is allowed; Hearts (current) is DISALLOWED
    expect(canPlayCard({ id: 'd3', suit: 'diamonds', rank: '3' }, 'hearts', false)).toBe(true)
    expect(canPlayCard({ id: 'h2', suit: 'hearts', rank: '2' }, 'hearts', false)).toBe(false)
    expect(canPlayCard({ id: 's4', suit: 'spades', rank: '4' }, 'hearts', false)).toBe(false)
    expect(canPlayCard({ id: 'c4', suit: 'clubs', rank: '4' }, 'hearts', false)).toBe(false)

    // Rest of cycle
    expect(canPlayCard({ id: 's5', suit: 'spades', rank: '5' }, 'diamonds', false)).toBe(true)
    expect(canPlayCard({ id: 'd5', suit: 'diamonds', rank: '5' }, 'diamonds', false)).toBe(false)
    expect(canPlayCard({ id: 'c6', suit: 'clubs', rank: '6' }, 'spades', false)).toBe(true)
    expect(canPlayCard({ id: 'h7', suit: 'hearts', rank: '7' }, 'clubs', false)).toBe(true)

    // King always playable when not last card
    expect(canPlayCard({ id: 'cK', suit: 'clubs', rank: 'K' }, 'hearts', false)).toBe(true)

    // Cannot end game with J, Q, or K
    expect(canPlayCard({ id: 'dJ', suit: 'diamonds', rank: 'J' }, 'hearts', true)).toBe(false)
    expect(canPlayCard({ id: 'dQ', suit: 'diamonds', rank: 'Q' }, 'hearts', true)).toBe(false)
    expect(canPlayCard({ id: 'dK', suit: 'diamonds', rank: 'K' }, 'hearts', true)).toBe(false)
    expect(canPlayCard({ id: 'd8', suit: 'diamonds', rank: '8' }, 'hearts', true)).toBe(true)
  })

  test('validateMove checks status, turn, card ownership, and strict next-season legality', () => {
    const state = dealInitialHands(['p1', 'p2'], 'p1', createSeededRng('fs-val'))
    state.activeSeason = 'hearts'
    state.playersRecord['p1'].hand = [
      { id: 'd5', suit: 'diamonds', rank: '5' },
      { id: 'h5', suit: 'hearts', rank: '5' },
      { id: 'c5', suit: 'clubs', rank: '5' },
    ]

    expect(validateMove(state, 'p1')).toBe(true)
    expect(validateMove(state, 'p2')).toBe(false)
    expect(validateMove(state, 'p1', 'd5')).toBe(true)
    expect(validateMove(state, 'p1', 'h5')).toBe(false)
    expect(validateMove(state, 'p1', 'c5')).toBe(false)
    expect(validateMove(state, 'p1', 'nonexistent')).toBe(false)
  })

  test('checkWinCondition and playCard detect empty hand victory', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1', createSeededRng('fs-win'))
    state.activeSeason = 'hearts'
    const card: Card = { id: 'd5', suit: 'diamonds', rank: '5' }
    state.playersRecord['p1'].hand = [card]

    expect(checkWinCondition(state).status).toBe('player_turns')

    state = playCard(state, 'p1', 'd5')
    expect(state.status).toBe('finished')
    expect(state.winnerId).toBe('p1')
  })

  test('Queen skips opponent turn and Jack makes both players draw 1 card', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1', createSeededRng('fs-special'))
    state.activeSeason = 'hearts'
    state.playersRecord['p1'].hand = [
      { id: 'dQ', suit: 'diamonds', rank: 'Q' },
      { id: 'sJ', suit: 'spades', rank: 'J' },
      { id: 'c5', suit: 'clubs', rank: '5' },
    ]
    state.playersRecord['p2'].hand = [{ id: 's7', suit: 'spades', rank: '7' }]

    // Queen of diamonds (next after hearts) skips p2 -> p1 keeps turn, activeSeason becomes diamonds
    state = playCard(state, 'p1', 'dQ')
    expect(state.currentTurnUserId).toBe('p1')
    expect(state.activeSeason).toBe('diamonds')

    // Jack of spades (next after diamonds) forces both to draw 1 and advances turn to p2
    const deckBefore = state.deck.length
    state = playCard(state, 'p1', 'sJ')
    expect(state.playersRecord['p1'].hand).toHaveLength(2) // 2 - 1 + 1
    expect(state.playersRecord['p2'].hand).toHaveLength(2) // 1 + 1
    expect(state.deck).toHaveLength(deckBefore - 2)
    expect(state.currentTurnUserId).toBe('p2')
  })

  test('applyEffect and King override activeSeason', () => {
    const state = dealInitialHands(['p1', 'p2'], 'p1', createSeededRng('fs-king'))
    state.activeSeason = 'hearts'
    const king: Card = { id: 'cK', suit: 'clubs', rank: 'K' }
    state.playersRecord['p1'].hand = [king, { id: 'h5', suit: 'hearts', rank: '5' }]

    const direct = applyEffect(state, king, 'p1', 'spades')
    expect(direct.state.activeSeason).toBe('spades')
    expect(direct.skipOpponentTurn).toBe(false)

    const played = playCard(state, 'p1', 'cK', 'spades')
    expect(played.activeSeason).toBe('spades')
    expect(played.currentTurnUserId).toBe('p2')
  })

  test('drawCard draws 1 card, reshuffles discard pile when deck is empty, and handles exhausted deck', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1', createSeededRng('fs-draw'))
    const initialDeck = state.deck.length
    const initialHand = state.playersRecord['p1'].hand.length

    state = drawCard(state, 'p1')
    expect(state.deck).toHaveLength(initialDeck - 1)
    expect(state.playersRecord['p1'].hand).toHaveLength(initialHand + 1)
    expect(state.currentTurnUserId).toBe('p2')

    // Empty deck reshuffles discard pile except top card
    state.deck = []
    state.discardPile = [
      { id: 'h2', suit: 'hearts', rank: '2' },
      { id: 'd3', suit: 'diamonds', rank: '3' },
      { id: 's4', suit: 'spades', rank: '4' },
    ]
    const reshuffledDraw = drawCard(state, 'p2', createSeededRng('reshuffle'))
    expect(reshuffledDraw.discardPile).toHaveLength(1)
    expect(reshuffledDraw.discardPile[0].id).toBe('s4')
    expect(reshuffledDraw.deck).toHaveLength(1)
    expect(reshuffledDraw.playersRecord['p2'].hand).toHaveLength(5)

    // Completely exhausted deck + single discard -> no-op
    reshuffledDraw.deck = []
    const exhausted = drawCard(reshuffledDraw, 'p1')
    expect(exhausted).toBe(reshuffledDraw)
  })
})
