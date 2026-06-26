import type { BlackjackGame, BlackjackPlayer } from '../types/blackjack'
import { DealerArea } from './DealerArea'
import { PlayerSeat } from './PlayerSeat'

interface Props {
  game: BlackjackGame
  players: BlackjackPlayer[]
  myUserId: string | undefined
  profileMap: Record<string, { username: string; avatarUrl: string | null }>
}

export function BlackjackTable({ game, players, myUserId, profileMap }: Props) {
  // Sort players by seat (0 to N)
  const seatedPlayers = [...players].sort((a, b) => a.seat - b.seat)

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto p-4 sm:p-8 gap-8">
      {/* Dealer section (Top) */}
      <div className="flex justify-center min-h-[12rem]">
        <DealerArea game={game} />
      </div>

      {/* Players section (Bottom arc) */}
      <div className="flex-1 flex items-end justify-center">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
          {seatedPlayers.map((p) => (
            <PlayerSeat
              key={p.user_id}
              player={p}
              game={game}
              isMe={p.user_id === myUserId}
              isMyTurn={game.current_turn === p.user_id}
              profileMap={profileMap}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
