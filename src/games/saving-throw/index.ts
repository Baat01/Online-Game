import { createElement } from 'react'
import { Dices } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'
import { createInitialState } from './engine/savingThrowEngine'
import { SavingThrowPage } from './pages/SavingThrowPage'

export const savingThrowPlugin: IGamePlugin = {
  id: 'saving-throw',
  slug: 'saving-throw',
  name: 'Saving Throw',
  description: 'Best of 5 rounds. First rolls 2d10, second must roll lower. Highest tension.',
  icon: Dices,
  minPlayers: 2,
  maxPlayers: 2,
  coverImage: '/games/saving-throw.jpg',
  isAvailable: true,

  createRoom: (_hostId, _maxPlayers) => {
    return {}
  },

  launch: (players: string[]) => {
    const hostId = players[0]
    return createInitialState(players, hostId) as unknown as Record<string, unknown>
  },

  routes: [
    {
      path: 'room/:roomId/play/saving-throw',
      element: createElement(SavingThrowPage),
    },
  ],
}
