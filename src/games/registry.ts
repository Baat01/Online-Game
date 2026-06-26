/**
 * Game Registry — Phase 3 activated.
 *
 * This is the single source of truth for all available games.
 * To add a new game:
 *   1. Create a folder at src/games/<your-game>/
 *   2. Export an IGamePlugin object from src/games/<your-game>/index.ts
 *   3. Import and add it to the GAME_REGISTRY array below
 *
 * The lobby, routing, and room creation all derive from this registry.
 */

import type { IGamePlugin } from '@/types/game'
import { blackjackPlugin } from './blackjack'

export const GAME_REGISTRY: IGamePlugin[] = [blackjackPlugin]

/**
 * Find a game plugin by its unique id.
 */
export function getGameById(id: string): IGamePlugin | undefined {
  return GAME_REGISTRY.find((g) => g.id === id)
}

/**
 * Find a game plugin by its URL slug.
 */
export function getGameBySlug(slug: string): IGamePlugin | undefined {
  return GAME_REGISTRY.find((g) => g.slug === slug)
}
