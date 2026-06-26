/**
 * ELO calculation helpers.
 * Note: Actual authoritative ELO updates are processed securely 
 * in the database via the `on_game_rooms_finished` trigger.
 * These utilities can be used for client-side estimations (e.g. "Expected +/-")
 */

export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function estimateEloChange(playerRating: number, opponentRating: number, result: 'win' | 'loss' | 'draw', kFactor = 32): number {
  const expected = calculateExpectedScore(playerRating, opponentRating);
  let actual = 0.5;
  if (result === 'win') actual = 1.0;
  if (result === 'loss') actual = 0.0;
  
  return Math.round(kFactor * (actual - expected));
}
