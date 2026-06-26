import { expect, test, describe } from 'vitest';
import { calculateExpectedScore, estimateEloChange } from './elo';

describe('ELO Calculations', () => {
  test('calculateExpectedScore', () => {
    // Equal rating should be 0.5 expected score
    expect(calculateExpectedScore(1200, 1200)).toBeCloseTo(0.5);
    // Higher rating should have higher expected score
    expect(calculateExpectedScore(1400, 1200)).toBeGreaterThan(0.5);
  });

  test('estimateEloChange', () => {
    // Beating an equal player gains 16 with K=32
    expect(estimateEloChange(1200, 1200, 'win')).toBe(16);
    // Losing to an equal player loses 16 with K=32
    expect(estimateEloChange(1200, 1200, 'loss')).toBe(-16);
    // Drawing with equal player changes nothing
    expect(estimateEloChange(1200, 1200, 'draw')).toBe(0);
    
    // Beating a better player yields more points
    expect(estimateEloChange(1200, 1600, 'win')).toBeGreaterThan(16);
  });
});
