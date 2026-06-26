import { Sparkles } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'
import { dealInitial } from './engine/twistEngine'

export const blackjackTwistPlugin: IGamePlugin = {
  id: 'blackjack-twist',
  slug: 'blackjack-twist',
  name: 'Blackjack Twist',
  description: 'Blackjack with a shared hidden card and sabotage mechanics.',
  icon: Sparkles,
  minPlayers: 2,
  maxPlayers: 2,
  coverImage: '/games/blackjack-twist.jpg',
  isAvailable: true,

  createRoom: (hostId: string, maxPlayers: number) => {
    return {}
  },
  
  launch: (players: string[]) => {
    const hostId = players[0]
    return dealInitial(players, hostId) as unknown as Record<string, unknown>
  }
}
