import { expect, test, describe } from 'vitest';
import { 
  createInitialState, 
  rollTwoD10, 
  combineDice, 
  resolveRound, 
  checkWinner, 
  nextRole,
  handleTiebreak 
} from './savingThrowEngine';

describe('Saving Throw Engine', () => {
  test('combineDice logic', () => {
    expect(combineDice(0, 0)).toBe(100);
    expect(combineDice(0, 5)).toBe(5);
    expect(combineDice(9, 9)).toBe(99);
    expect(combineDice(4, 2)).toBe(42);
  });

  test('rollTwoD10 returns valid dice', () => {
    for (let i = 0; i < 50; i++) {
      const [t, u] = rollTwoD10();
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(9);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(9);
    }
  });

  test('initial state creation', () => {
    const state = createInitialState(['player1', 'player2'], 'player1');
    expect(state.challengerId).toBe('player2');
    expect(state.status).toBe('waiting');
    expect(state.playersRecord['player1'].score).toBe(0);
  });

  test('resolveRound properly assigns winner', () => {
    const state = createInitialState(['p1', 'p2'], 'p1');
    state.playersRecord['p1'].role = 'first';
    state.playersRecord['p1'].finalScore = 50;
    
    state.playersRecord['p2'].role = 'second';
    state.playersRecord['p2'].finalScore = 49; // Lower wins

    const resolved = resolveRound(state);
    expect(resolved.roundWinnerId).toBe('p2');
    expect(resolved.playersRecord['p2'].wins).toBe(1);
    expect(resolved.status).toBe('result');
  });

  test('checkWinner', () => {
    const state = createInitialState(['p1', 'p2'], 'p1');
    state.playersRecord['p1'].wins = 3;
    const winnerState = checkWinner(state);
    expect(winnerState.gameWinnerId).toBe('p1');
    expect(winnerState.status).toBe('finished');
  });

  test('nextRole correctly swaps roles', () => {
    const state = createInitialState(['p1', 'p2'], 'p1');
    state.playersRecord['p1'].role = 'first';
    state.playersRecord['p2'].role = 'second';

    const nextState = nextRole(state);
    expect(nextState.playersRecord['p1'].role).toBe('second');
    expect(nextState.playersRecord['p2'].role).toBe('first');
    expect(nextState.currentTurnUserId).toBe('p2'); // since second becomes first, wait, the new first is p2. But the code sets currentTurnUserId to second.userId (which is p2). Let's verify. Yes.
  });

  test('handleTiebreak', () => {
    const state = createInitialState(['p1', 'p2'], 'p1');
    state.challengerId = 'p2';
    
    // We can't easily mock flipCoin without vi.mock, but we can check if it finishes
    const tbState = handleTiebreak(state, 'heads');
    expect(tbState.status).toBe('finished');
    expect(['p1', 'p2']).toContain(tbState.gameWinnerId);
    expect(tbState.coinResult).not.toBeNull();
  });
});
