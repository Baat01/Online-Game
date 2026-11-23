import { createElement } from 'react'
import { CloudRain } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'
import { dealInitialHands } from './engine/fourSeasonsEngine'
import { FourSeasonsPage } from './pages/FourSeasonsPage'

export const fourSeasonsPlugin: IGamePlugin = {
  id: 'four-seasons',
  slug: 'four-seasons',
  name: 'Four Seasons',
  description:
    'First to empty their hand wins. Follow the seasons, use special cards to gain the upper hand.',
  icon: CloudRain,
  minPlayers: 2,
  maxPlayers: 2,
  coverImage: '/games/four-seasons.jpg',
  isAvailable: true,

  createRoom: (_hostId: string, _maxPlayers: number) => {
    return {}
  },

  launch: (players: string[]) => {
    const hostId = players[0]
    return dealInitialHands(players, hostId) as unknown as Record<string, unknown>
  },

  routes: [
    {
      path: 'room/:roomId/play/four-seasons',
      element: createElement(FourSeasonsPage),
    },
  ],
}
