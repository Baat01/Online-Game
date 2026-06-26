import { Spade } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'

/**
 * Blackjack game plugin.
 *
 * Phase 4: Full Blackjack game logic implemented.
 */
export const blackjackPlugin: IGamePlugin = {
  id: 'blackjack',
  slug: 'blackjack',
  name: 'Blackjack',
  description:
    'Classic card game — beat the dealer without going over 21. First to bust loses.',
  icon: Spade,
  minPlayers: 2,
  maxPlayers: 6,
  coverImage: '/games/blackjack.jpg',
  isAvailable: true,
}
