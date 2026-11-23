import { createElement } from 'react'
import { Sparkles } from 'lucide-react'
import type { IGamePlugin } from '@/types/game'
import { createInitialArcane23State } from './engine/arcane23Engine'
import { Arcane23Page } from './pages/Arcane23Page'

export const arcane23Plugin: IGamePlugin = {
  id: '23e-arcane',
  slug: '23e-arcane',
  name: 'Le 23e Arcane',
  description:
    'Duel asymétrique en 5 manches mêlant paquets de 52 cartes, les 22 Arcanes Majeurs du Tarot Undertale et l’anomalie 1/666 Gaster.',
  icon: Sparkles,
  minPlayers: 2,
  maxPlayers: 2,
  coverImage: '/games/23e-arcane.jpg',
  isAvailable: true,

  createRoom: (_hostId, _maxPlayers) => {
    return {}
  },

  launch: (players: string[]) => {
    const hostId = players[0]
    return createInitialArcane23State(players, hostId) as unknown as Record<string, unknown>
  },

  routes: [
    {
      path: 'room/:roomId/play/23e-arcane',
      element: createElement(Arcane23Page),
    },
  ],
}
