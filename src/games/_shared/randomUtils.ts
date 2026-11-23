/**
 * Shared deterministic & controllable random utilities, dice utilities, and coin flip utility.
 */

export type RngFn = () => number

/**
 * Create a deterministic pseudo-random number generator (Mulberry32) from a numeric or string seed.
 * Produces floats in [0, 1).
 */
export function createSeededRng(seed: number | string): RngFn {
  let h = 2166136261 >>> 0
  const seedStr = String(seed)
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Roll a single die with `sides` faces (returns integer 1..sides).
 */
export function rollDie(sides: number, rng: RngFn = Math.random): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new Error(`Invalid die sides: ${sides}`)
  }
  return Math.floor(rng() * sides) + 1
}

/**
 * Alias for rollDie to preserve backward compatibility.
 */
export function rollDice(sides: number, rng: RngFn = Math.random): number {
  return rollDie(sides, rng)
}

/**
 * Roll 2d10 percentile dice:
 * - tens die: 0..9 (representing 00..90)
 * - units die: 0..9
 */
export function roll2d10(rng: RngFn = Math.random): [number, number] {
  const tens = rollDie(10, rng) - 1
  const units = rollDie(10, rng) - 1
  return [tens, units]
}

/**
 * Combine a tens die (0..9) and units die (0..9) into a d100 score (1..100).
 * 00 + 0 = 100.
 */
export function combine2d10(tens: number, units: number): number {
  if (tens === 0 && units === 0) return 100
  return tens * 10 + units
}

/**
 * Flip a fair two-sided coin ('heads' or 'tails').
 */
export function flipCoin(rng: RngFn = Math.random): 'heads' | 'tails' {
  return rng() < 0.5 ? 'heads' : 'tails'
}

/**
 * Fisher-Yates shuffle returning a new array without mutating input.
 */
export function shuffleArray<T>(items: readonly T[], rng: RngFn = Math.random): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
