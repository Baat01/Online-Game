import { Check, Copy, Spade, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { getGameBySlug } from '@/games/registry'
import type { GameRoom } from '@/types/lobby'

const STATE_LABELS: Record<GameRoom['state'], { label: string; className: string }> = {
  waiting: { label: 'Waiting', className: 'bg-surface-700 text-slate-400' },
  ready: { label: 'Ready to Launch', className: 'bg-brand-500/20 text-brand-400 border border-brand-500/30' },
  playing: { label: 'In Progress', className: 'bg-gold-500/20 text-gold-400 border border-gold-500/30' },
  finished: { label: 'Finished', className: 'bg-surface-700 text-slate-500' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/15 text-red-400' },
}

interface RoomHeaderProps {
  room: GameRoom
}

/**
 * Room header: game name + icon, state badge, player count, and share link.
 */
export function RoomHeader({ room }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)
  const plugin = getGameBySlug(room.gameSlug)
  const Icon = plugin?.icon ?? Spade
  const gameName = plugin?.name ?? room.gameSlug
  const { label, className: stateClass } = STATE_LABELS[room.state]

  const handleCopy = async () => {
    const url = `${window.location.origin}/room/${room.id}`
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-card bg-surface-800 border border-surface-700">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Game identity */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shrink-0">
            <Icon className="size-5 text-brand-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">{gameName}</h1>
            <p className="text-xs text-slate-500 font-mono">
              Room <span className="text-slate-400">{room.id.slice(0, 8)}…</span>
            </p>
          </div>
        </div>

        {/* State badge */}
        <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', stateClass)}>
          {label}
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Player count */}
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <Users className="size-4" aria-hidden="true" />
          <span>
            <span className="text-slate-100 font-semibold">{room.players.length}</span>
            {' / '}
            {room.maxPlayers} players
          </span>
        </div>

        {/* Share link */}
        <Button
          id="copy-room-link"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          leftIcon={
            copied
              ? <Check className="size-3.5 text-brand-400" aria-hidden="true" />
              : <Copy className="size-3.5" aria-hidden="true" />
          }
          className={clsx(copied && 'text-brand-400')}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </div>
    </div>
  )
}
