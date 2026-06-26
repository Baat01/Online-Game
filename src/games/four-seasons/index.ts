import { CloudRain } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'
import { dealInitialHands } from './engine/fourSeasonsEngine'

export const fourSeasonsPlugin: IGamePlugin = {
  id: 'four-seasons',
  slug: 'four-seasons',
  name: 'Four Seasons',
  description: 'First to empty their hand wins. Follow the seasons, use special cards to gain the upper hand.',
  icon: CloudRain,
  minPlayers: 2,
  maxPlayers: 2,
  coverImage: '/games/four-seasons.jpg',
  isAvailable: true,

  createRoom: (hostId: string, maxPlayers: number) => {
    return {}
  },
  
  launch: (players: string[]) => {
    const hostId = players[0]
    return dealInitialHands(players, hostId) as unknown as Record<string, unknown>
  }
}
