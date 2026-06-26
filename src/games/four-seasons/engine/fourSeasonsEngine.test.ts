import { expect, test, describe } from 'vitest';
import { 
  dealInitialHands, 
  canPlayCard, 
  playCard, 
  drawCard 
} from './fourSeasonsEngine';
import { Card } from '../../_shared/deck';

describe('Four Seasons Engine', () => {
  test('dealInitialHands sets up game correctly', () => {
    const state = dealInitialHands(['p1', 'p2'], 'p1');
    expect(state.playersRecord['p1'].hand.length).toBe(4);
    expect(state.playersRecord['p2'].hand.length).toBe(4);
    expect(state.discardPile.length).toBe(1);
    expect(state.deck.length).toBe(52 - 9); // 43
  });

  test('canPlayCard logic', () => {
    // If active season is hearts (spring), can play diamonds (summer) or hearts
    const hearts2: Card = { id: 'h2', suit: 'hearts', rank: '2' };
    const diamonds3: Card = { id: 'd3', suit: 'diamonds', rank: '3' };
    const spades4: Card = { id: 's4', suit: 'spades', rank: '4' };
    const king: Card = { id: 'cK', suit: 'clubs', rank: 'K' };

    expect(canPlayCard(diamonds3, 'hearts', false)).toBe(true);
    expect(canPlayCard(hearts2, 'hearts', false)).toBe(true);
    expect(canPlayCard(spades4, 'hearts', false)).toBe(false);

    // King can always be played
    expect(canPlayCard(king, 'hearts', false)).toBe(true);

    // Cannot end game with face card
    expect(canPlayCard({ id: 'hJ', suit: 'hearts', rank: 'J' }, 'hearts', true)).toBe(false);
  });

  test('playCard logic - normal play advances turn', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1');
    state.activeSeason = 'hearts';
    const card: Card = { id: 'd5', suit: 'diamonds', rank: '5' };
    state.playersRecord['p1'].hand = [card];

    state = playCard(state, 'p1', 'd5');
    expect(state.status).toBe('finished');
    expect(state.winnerId).toBe('p1');
  });

  test('playCard logic - Queen skips turn', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1');
    state.activeSeason = 'hearts';
    const queen: Card = { id: 'dQ', suit: 'diamonds', rank: 'Q' };
    state.playersRecord['p1'].hand = [queen, { id: 'd5', suit: 'diamonds', rank: '5' }];

    state = playCard(state, 'p1', 'dQ');
    // It should STILL be p1's turn
    expect(state.currentTurnUserId).toBe('p1');
  });

  test('playCard logic - Jack makes both draw', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1');
    state.activeSeason = 'hearts';
    const jack: Card = { id: 'dJ', suit: 'diamonds', rank: 'J' };
    state.playersRecord['p1'].hand = [jack, { id: 'h5', suit: 'hearts', rank: '5' }];
    state.playersRecord['p2'].hand = [{ id: 's5', suit: 'spades', rank: '5' }];

    state = playCard(state, 'p1', 'dJ');
    expect(state.playersRecord['p1'].hand.length).toBe(2); // 2 - 1 + 1 draw
    expect(state.playersRecord['p2'].hand.length).toBe(2); // 1 + 1 draw
    expect(state.currentTurnUserId).toBe('p2');
  });

  test('playCard logic - King changes season', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1');
    state.activeSeason = 'hearts';
    const king: Card = { id: 'cK', suit: 'clubs', rank: 'K' };
    state.playersRecord['p1'].hand = [king, { id: 'h5', suit: 'hearts', rank: '5' }];

    state = playCard(state, 'p1', 'cK', 'spades');
    expect(state.activeSeason).toBe('spades');
  });

  test('drawCard logic', () => {
    let state = dealInitialHands(['p1', 'p2'], 'p1');
    const initialDeckSize = state.deck.length;
    const initialHandSize = state.playersRecord['p1'].hand.length;

    state = drawCard(state, 'p1');
    expect(state.deck.length).toBe(initialDeckSize - 1);
    expect(state.playersRecord['p1'].hand.length).toBe(initialHandSize + 1);
    expect(state.currentTurnUserId).toBe('p2');
  });
});
