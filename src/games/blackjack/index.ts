import { Spade } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'

/**
 * Blackjack game plugin.
 *
 * Phase 3: Placeholder only — enables lobby, room creation, and invitations.
 * Phase 4: Will add full Blackjack game logic (deck, hands, scoring).
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
