import clsx from 'clsx'
import type { BlackjackPlayer, BlackjackGame } from '../types/blackjack'
import { CardStack } from './CardStack'
import { User } from 'lucide-react'

interface Props {
  player: BlackjackPlayer
  game: BlackjackGame
  isMe: boolean
  isMyTurn: boolean
  profileMap: Record<string, { username: string; avatarUrl: string | null }>
}

export function PlayerSeat({ player, game, isMe, isMyTurn, profileMap }: Props) {
  const profile = profileMap[player.user_id]
  const isTurn = game.current_turn === player.user_id

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center gap-3 p-4 rounded-xl transition-all',
        isTurn ? 'bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-surface-800/50',
        isMe && 'border border-indigo-500/30'
      )}
    >
      {/* Turn indicator pulse */}
      {isTurn && (
        <div className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
        </div>
      )}

      {/* Avatar & Info */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-700 flex items-center justify-center border border-white/10">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-white/50" />
          )}
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-white/90 truncate max-w-[80px]">
            {isMe ? 'You' : profile?.username || 'Player'}
          </p>
          
          {/* Status badges */}
          <div className="mt-1 h-4 flex items-center justify-center">
            {player.blackjack && <span className="text-[10px] uppercase font-bold text-yellow-400">Blackjack!</span>}
            {player.busted && <span className="text-[10px] uppercase font-bold text-red-400">Bust</span>}
            {player.standing && !player.blackjack && !player.busted && <span className="text-[10px] uppercase font-bold text-slate-400">Stand</span>}
            {!player.blackjack && !player.busted && !player.standing && player.score > 0 && (
              <span className="text-[10px] font-mono text-white/70">{player.score}</span>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="min-h-[8rem] flex items-center justify-center">
        {player.hand.length > 0 ? (
          <CardStack cards={player.hand} stacked={false} />
        ) : (
          <div className="w-16 h-24 border border-dashed border-white/10 rounded-lg" />
        )}
      </div>
    </div>
  )
}
