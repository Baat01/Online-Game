import { useState } from 'react'
import { Gamepad2, Coins } from 'lucide-react'
import { GAME_REGISTRY } from '@/games/registry'
import { useToast } from '@/components/ui/Toast'
import { useLobby } from '@/hooks/useLobby'
import { useAuth } from '@/hooks/useAuth'
import { GameCard } from '@/components/lobby/GameCard'
import { InvitationCenter } from '@/components/lobby/InvitationCenter'
import { GamesPageSkeleton } from '@/components/lobby/LobbySkeleton'
import { CardThemeSelector } from '@/games/_shared/components'
import { DEFAULT_YEN_BALANCE, formatYen } from '@/services/wallet/walletService'

/**
 * Games page — /games (protected).
 *
 * Displays all registered games from the client-side registry.
 * Shows pending invitations in an InvitationCenter banner at the top.
 * "Create Room" creates a room and navigates to /room/:id via useLobby.
 */
export function GamesPage() {
  const {
    invites,
    isInvitesLoading,
    isCreatingRoom,
    createRoom,
    accept,
    decline,
  } = useLobby()

  const { toast } = useToast()
  const { profile } = useAuth()
  const [creatingSlug, setCreatingSlug] = useState<string | null>(null)
  const [pendingAccept, setPendingAccept] = useState<string | null>(null)
  const [pendingDecline, setPendingDecline] = useState<string | null>(null)

  const handleCreateRoom = async (gameSlug: string) => {
    setCreatingSlug(gameSlug)
    try {
      await createRoom(gameSlug)
      // Navigation happens inside useLobby.createRoom onSuccess
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create room.', 'error')
    } finally {
      setCreatingSlug(null)
    }
  }

  const handleAccept = async (inviteId: string) => {
    setPendingAccept(inviteId)
    try {
      await accept(inviteId)
      // Navigation to room happens inside useLobby.accept onSuccess
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to accept invitation.', 'error')
    } finally {
      setPendingAccept(null)
    }
  }

  const handleDecline = async (inviteId: string) => {
    setPendingDecline(inviteId)
    try {
      await decline(inviteId)
      toast('Invitation declined.', 'info')
    } catch {
      toast('Failed to decline invitation.', 'error')
    } finally {
      setPendingDecline(null)
    }
  }

  const games = GAME_REGISTRY

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="size-5 text-brand-400" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-100">Games</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300">
              Cercle Engei 宴芸
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Choisissez une table, invitez un rival et fixez une mise à la Banque des 6 Lances (ou jouez à 0 ¥).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface-800 border border-gold-500/30 text-gold-300 text-xs font-mono font-semibold">
            <Coins className="size-3.5 text-gold-400" aria-hidden="true" />
            <span>
              {formatYen(
                profile?.yen_balance ?? DEFAULT_YEN_BALANCE,
                Boolean(profile?.is_admin),
                true,
              )}
            </span>
          </div>
          <CardThemeSelector mode="modal" />
        </div>
      </div>

      {/* Pending invitations */}
      {!isInvitesLoading && (
        <InvitationCenter
          invites={invites}
          pendingAccept={pendingAccept}
          pendingDecline={pendingDecline}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}

      {/* Games grid */}
      {games.length === 0 ? (
        <GamesPageSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isCreating={isCreatingRoom && creatingSlug === game.slug}
              onCreateRoom={handleCreateRoom}
            />
          ))}
        </div>
      )}
    </div>
  )
}
