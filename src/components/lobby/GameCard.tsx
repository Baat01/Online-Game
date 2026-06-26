import { Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { IGamePlugin } from '@/types/game'

interface GameCardProps {
  game: IGamePlugin
  isCreating?: boolean
  onCreateRoom: (gameSlug: string) => void
}

/**
 * Game catalogue card — displayed on the /games page.
 * Shows game icon, name, description, player count, and a create-room button.
 * When the game is not available, shows a "Coming Soon" badge instead of the button.
 */
export function GameCard({ game, isCreating = false, onCreateRoom }: GameCardProps) {
  const Icon = game.icon

  return (
    <div className="group relative flex flex-col rounded-card border border-surface-700 bg-surface-800 overflow-hidden transition-all duration-200 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5">
      {/* Coming soon overlay */}
      {!game.isAvailable && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-900/70 backdrop-blur-sm">
          <span className="px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-400 text-sm font-semibold">
            Coming Soon
          </span>
        </div>
      )}

      {/* Card header — icon + gradient */}
      <div className="h-28 bg-gradient-to-br from-brand-500/20 via-surface-700 to-surface-800 flex items-center justify-center">
        <div className="size-14 rounded-2xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shadow-inner">
          <Icon className="size-7 text-brand-400" aria-hidden="true" />
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-100 mb-1">{game.name}</h2>
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{game.description}</p>
        </div>

        {/* Player count */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="size-3.5" aria-hidden="true" />
          <span>
            {game.minPlayers}–{game.maxPlayers} players
          </span>
        </div>

        {/* Action */}
        <Button
          id={`create-room-${game.slug}`}
          variant="primary"
          size="md"
          isLoading={isCreating}
          disabled={!game.isAvailable}
          onClick={() => onCreateRoom(game.slug)}
          className="w-full mt-1"
        >
          Create Room
        </Button>
      </div>
    </div>
  )
}
