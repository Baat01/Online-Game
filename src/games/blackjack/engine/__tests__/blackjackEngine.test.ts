import { describe, it, expect } from 'vitest'
import { createDeck, shuffle, calculateScore, canHit, canStand, deal, nextTurn, dealerPlay, settle, reset } from '../blackjackEngine'
import type { BlackjackGame, BlackjackPlayer } from '../../types/blackjack'

describe('Blackjack Engine', () => {
  describe('createDeck', () => {
    it('creates 52 cards', () => {
      const deck = createDeck()
      expect(deck.length).toBe(52)
      // Check values
      const aces = deck.filter(c => c.rank === 'A')
      expect(aces.length).toBe(4)
      expect(aces[0].value).toBe(11)
    })
  })

  describe('shuffle', () => {
    it('shuffles the deck', () => {
      const deck = createDeck()
      const shuffled = shuffle(createDeck())
      expect(shuffled.length).toBe(52)
      expect(shuffled).not.toEqual(deck)
    })
  })

  describe('calculateScore', () => {
    it('calculates simple score', () => {
      expect(calculateScore([
        { suit: 'hearts', rank: '2', value: 2 },
        { suit: 'hearts', rank: '10', value: 10 }
      ])).toBe(12)
    })

    it('handles aces as 11', () => {
      expect(calculateScore([
        { suit: 'hearts', rank: 'A', value: 11 },
        { suit: 'hearts', rank: '9', value: 9 }
      ])).toBe(20)
    })

    it('handles aces as 1 if bust', () => {
      expect(calculateScore([
        { suit: 'hearts', rank: 'A', value: 11 },
        { suit: 'hearts', rank: '9', value: 9 },
        { suit: 'hearts', rank: '5', value: 5 }
      ])).toBe(15) // 11+9+5 = 25 -> 1+9+5 = 15
    })
  })

  describe('deal', () => {
    it('deals 2 cards to players and dealer', () => {
      const game = { deck: [] } as unknown as BlackjackGame
      const players = [{ user_id: 'u1' }, { user_id: 'u2' }] as BlackjackPlayer[]
      
      const result = deal(game, players)
      
      expect(result.game.deck.length).toBe(52 - 6) // 2 * 2 players + 2 dealer
      expect(result.players[0].hand.length).toBe(2)
      expect(result.players[1].hand.length).toBe(2)
      expect(result.game.dealer_hand.length).toBe(2)
      expect(result.game.dealer_hand[1].isHidden).toBe(true)
    })
  })
})
