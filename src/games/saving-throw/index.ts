import { Dices } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'
import { createInitialState } from './engine/savingThrowEngine'

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

  createRoom: (hostId: string, maxPlayers: number) => {
    return {}
  },
  
  launch: (players: string[]) => {
    // Only works for 2 players
    const hostId = players[0] // or passed in, but the launcher can just use first player as host roughly, or we initialize properly in the component
    return createInitialState(players, hostId) as unknown as Record<string, unknown>
  }
}
