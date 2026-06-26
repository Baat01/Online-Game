import { expect, test, describe } from 'vitest';
import { 
  createDeck, 
  dealInitial, 
  calculateScore, 
  applyCardEffect, 
  resolveGame 
} from './twistEngine';

describe('Blackjack Twist Engine', () => {
  test('createDeck has 52 cards', () => {
    expect(createDeck().length).toBe(52);
  });

  test('dealInitial sets up shared hidden card and hands', () => {
    const state = dealInitial(['p1', 'p2'], 'p1');
    expect(state.sharedHiddenCard).not.toBeNull();
    expect(state.sharedHiddenCard?.isHidden).toBe(true);
    expect(state.playersRecord['p1'].hand.length).toBe(2);
    expect(state.playersRecord['p2'].hand.length).toBe(2);
    expect(state.deck.length).toBe(52 - 1 - 4); // 47
  });

  test('calculateScore calculates A properly', () => {
    const hand = [
      { id: 'hearts-A', suit: 'hearts' as const, rank: 'A' as const },
      { id: 'hearts-9', suit: 'hearts' as const, rank: '9' as const }
    ];
    expect(calculateScore(hand, null, false)).toBe(20);

    const hand2 = [
      { id: 'hearts-A', suit: 'hearts' as const, rank: 'A' as const },
      { id: 'hearts-9', suit: 'hearts' as const, rank: '9' as const },
      { id: 'hearts-2', suit: 'hearts' as const, rank: '2' as const }
    ];
    // 11 + 9 + 2 = 22 -> 1 + 9 + 2 = 12
    expect(calculateScore(hand2, null, false)).toBe(12);
  });

  test('applyCardEffect logic', () => {
    const player = { userId: 'p2', hand: [], score: 0, hasStood: false, busted: false };
    
    // Give Jack to opponent
    const updated = applyCardEffect({ id: 'spades-J', suit: 'spades', rank: 'J' }, 'give', player);
    expect((updated.hand[0] as any).currentValue).toBe(-3);

    // Give King with +3
    const updated2 = applyCardEffect({ id: 'spades-K', suit: 'spades', rank: 'K' }, 'give', updated, '+3');
    expect((updated2.hand[1] as any).currentValue).toBe(3);
  });

  test('resolveGame reveals shared card and decides winner', () => {
    const state = dealInitial(['p1', 'p2'], 'p1');
    // Force scores
    state.playersRecord['p1'].hand = [{ id: '1', suit: 'hearts', rank: '10' }]; // 10
    state.playersRecord['p2'].hand = [{ id: '2', suit: 'hearts', rank: '9' }]; // 9
    state.sharedHiddenCard = { id: '3', suit: 'hearts', rank: 'A', isHidden: true }; // 11
    // p1 = 21, p2 = 20

    const resolved = resolveGame(state);
    expect(resolved.sharedRevealed).toBe(true);
    expect(resolved.winnerId).toBe('p1');
    expect(resolved.playersRecord['p1'].score).toBe(21);
    expect(resolved.playersRecord['p2'].score).toBe(20);
  });
});
