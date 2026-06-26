import { Bell } from 'lucide-react'
import { clsx } from 'clsx'
import { Avatar } from '@/components/friends/Avatar'
import { Button } from '@/components/ui/Button'
import { getGameBySlug } from '@/games/registry'
import type { GameInvitation } from '@/types/lobby'

interface InvitationCenterProps {
  invites: GameInvitation[]
  pendingAccept: string | null
  pendingDecline: string | null
  onAccept: (inviteId: string) => void
  onDecline: (inviteId: string) => void
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m`
}

/**
 * InvitationCenter — shown at the top of GamesPage when there are pending invitations.
 * Each invitation card shows sender info, game name, time remaining, and accept/decline actions.
 */
export function InvitationCenter({
  invites,
  pendingAccept,
  pendingDecline,
  onAccept,
  onDecline,
}: InvitationCenterProps) {
  if (invites.length === 0) return null

  return (
    <section
      className="mb-8 p-4 rounded-card bg-brand-500/5 border border-brand-500/25 animate-slide-up"
      aria-labelledby="invitations-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <Bell className="size-4 text-brand-400" aria-hidden="true" />
        <h2 id="invitations-heading" className="text-sm font-semibold text-brand-300">
          {invites.length} pending {invites.length === 1 ? 'invitation' : 'invitations'}
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {invites.map((invite) => {
          const game = getGameBySlug(invite.gameSlug)
          const GameIcon = game?.icon

          return (
            <div
              key={invite.id}
              className="flex items-center gap-3 p-3 rounded-btn bg-surface-800 border border-surface-700 flex-wrap"
            >
              {/* Sender */}
              {invite.sender && (
                <Avatar
                  url={invite.sender.avatar_url}
                  username={invite.sender.username}
                  size="sm"
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">
                  <span className="text-brand-400">
                    {invite.sender?.display_name ?? invite.sender?.username ?? 'Someone'}
                  </span>{' '}
                  invited you to play
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {GameIcon && (
                    <GameIcon className="size-3 text-slate-500" aria-hidden="true" />
                  )}
                  <p className="text-xs text-slate-500">
                    {game?.name ?? invite.gameSlug}
                    {' · '}
                    <span
                      className={clsx(
                        'font-medium',
                        new Date(invite.expiresAt).getTime() - Date.now() < 60_000
                          ? 'text-red-400'
                          : 'text-slate-500',
                      )}
                    >
                      {formatTimeLeft(invite.expiresAt)} left
                    </span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <Button
                  id={`decline-invite-${invite.id}`}
                  variant="ghost"
                  size="sm"
                  isLoading={pendingDecline === invite.id}
                  disabled={pendingAccept === invite.id}
                  onClick={() => onDecline(invite.id)}
                >
                  Decline
                </Button>
                <Button
                  id={`accept-invite-${invite.id}`}
                  variant="primary"
                  size="sm"
                  isLoading={pendingAccept === invite.id}
                  disabled={pendingDecline === invite.id}
                  onClick={() => onAccept(invite.id)}
                >
                  Accept
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
