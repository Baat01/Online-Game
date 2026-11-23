import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogOut, Rocket, UserPlus, Coins, Shield } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRoom, useOutgoingInvites, useLobby, lobbyKeys } from '@/hooks/useLobby'
import { usePresence } from '@/hooks/usePresence'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { RoomHeader } from '@/components/lobby/RoomHeader'
import { RoomPlayerCard } from '@/components/lobby/RoomPlayerCard'
import { ReadyToggle } from '@/components/lobby/ReadyToggle'
import { InviteModal } from '@/components/lobby/InviteModal'
import { EmptyRoomState } from '@/components/lobby/EmptyRoomState'
import { RoomPageSkeleton } from '@/components/lobby/LobbySkeleton'
import { CardThemeSelector } from '@/games/_shared/components'
import {
  PRESET_YEN_STAKES,
  formatYen,
  getRoomStake,
  setRoomStake,
} from '@/services/wallet/walletService'

/**
 * Game Room page — /room/:roomId (protected).
 *
 * Sections:
 *  - RoomHeader: game name, state, player count, share link
 *  - Players list: RoomPlayerCard per player, host controls (kick)
 *  - Actions: ReadyToggle (players), LaunchGame (host), Leave Room, Invite Friends
 *  - InviteModal: friend search + invite
 *
 * Realtime updates via useRoom (subscribeToRoom).
 */
export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  const { toast } = useToast()

  // ── Room data + realtime ─────────────────────────────────────────────────
  const { data: room, isLoading: isRoomLoading, error: roomError } = useRoom(roomId ?? '')
  const { data: outgoingInvites = [] } = useOutgoingInvites(roomId ?? '')

  const {
    setReady,
    launchGame,
    kickPlayer,
    leaveRoom,
    invite,
  } = useLobby()

  // ── Presence for players ─────────────────────────────────────────────────
  const playerIds = room?.players.map((p) => p.userId) ?? []
  const { isOnline } = usePresence(playerIds)

  // ── Local UI state ───────────────────────────────────────────────────────
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [pendingKick, setPendingKick] = useState<string | null>(null)
  const [pendingReady, setPendingReady] = useState(false)
  const [pendingLaunch, setPendingLaunch] = useState(false)
  const [pendingLeave, setPendingLeave] = useState(false)
  const [pendingStake, setPendingStake] = useState(false)
  const [customStakeInput, setCustomStakeInput] = useState('')

  // ── Derived state ────────────────────────────────────────────────────────
  const isHost = user?.id === room?.hostId
  const isAdmin = Boolean(profile?.is_admin)
  const myPlayer = room?.players.find((p) => p.userId === user?.id)
  const isReady = myPlayer?.ready ?? false
  const canLaunch = isHost && room?.state === 'ready'
  const isPlaying = room?.state === 'playing'
  const isFinished = room?.state === 'finished' || room?.state === 'cancelled'
  const activeStake = getRoomStake(room)

  // ── Auto-enter game table for all seated players when room transitions to playing ──
  useEffect(() => {
    if (!roomId || !room || room.state !== 'playing') return
    if (!myPlayer) return

    const targetPath =
      room.gameSlug === 'blackjack'
        ? `/room/${roomId}/play`
        : `/room/${roomId}/play/${room.gameSlug}`

    const timer = window.setTimeout(() => {
      navigate(targetPath)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [roomId, room, myPlayer, navigate])

  const handleStakeChange = async (nextStake: number) => {
    if (!roomId || !user) return
    setPendingStake(true)
    try {
      await setRoomStake(roomId, nextStake, {
        id: user.id,
        is_admin: isAdmin,
      })
      void queryClient.invalidateQueries({ queryKey: lobbyKeys.room(roomId) })
      toast(
        nextStake === 0
          ? 'Mise réglée sur 0 ¥ (Partie Amicale).'
          : `Mise réglée sur ${formatYen(nextStake)} — confirmez Prêt.`,
        'info',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Impossible de modifier la mise.', 'error')
    } finally {
      setPendingStake(false)
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleReady = async (ready: boolean) => {
    if (!roomId) return
    setPendingReady(true)
    try {
      await setReady(roomId, ready)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update ready state.', 'error')
    } finally {
      setPendingReady(false)
    }
  }

  const handleLaunch = async () => {
    if (!roomId) return
    setPendingLaunch(true)
    try {
      await launchGame(roomId)
      // Phase 4/5: navigate to game view
      if (room?.gameSlug) {
        if (room.gameSlug === 'blackjack') {
          // Backward compatibility for existing hardcoded route
          navigate(`/room/${roomId}/play`)
        } else {
          navigate(`/room/${roomId}/play/${room.gameSlug}`)
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to launch game.', 'error')
    } finally {
      setPendingLaunch(false)
    }
  }

  const handleLeave = async () => {
    if (!roomId) return
    setPendingLeave(true)
    try {
      await leaveRoom(roomId)
      // Navigation to /games happens inside useLobby.leaveRoom onSuccess
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to leave room.', 'error')
      setPendingLeave(false)
    }
  }

  const handleKick = async (userId: string) => {
    if (!roomId) return
    setPendingKick(userId)
    try {
      await kickPlayer(roomId, userId)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to kick player.', 'error')
    } finally {
      setPendingKick(null)
    }
  }

  const handleInvite = async (receiverId: string) => {
    if (!roomId || !room) return
    await invite(roomId, receiverId, room.gameSlug)
    toast('Invitation sent!', 'success')
  }

  // ── Error / Loading states ────────────────────────────────────────────────

  if (!roomId) {
    navigate('/games', { replace: true })
    return null
  }

  if (isRoomLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <RoomPageSkeleton />
      </div>
    )
  }

  if (roomError || !room) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-400 mb-4">Room not found or no longer available.</p>
        <Button id="back-to-games" variant="secondary" onClick={() => navigate('/games')}>
          Back to Games
        </Button>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in space-y-4">
      {/* Room header */}
      <RoomHeader room={room} />

      {/* Playing / finished states */}
      {isPlaying && (
        <div className="rounded-card bg-gold-500/10 border border-gold-500/35 p-6 text-center animate-slide-up space-y-2">
          <p className="text-gold-300 font-bold text-lg">La partie commence…</p>
          <p className="text-xs text-slate-400">
            Entrée automatique sur la table d’Engei en cours.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              if (room?.gameSlug) {
                if (room.gameSlug === 'blackjack') {
                  navigate(`/room/${roomId}/play`)
                } else {
                  navigate(`/room/${roomId}/play/${room.gameSlug}`)
                }
              }
            }}
          >
            Join Game Table
          </Button>
        </div>
      )}

      {isFinished && (
        <div className="rounded-card bg-surface-800 border border-surface-700 p-6 text-center">
          <p className="text-slate-300 font-semibold text-lg mb-3">
            {room.state === 'cancelled' ? '🚫 Room Cancelled' : '🏁 Game Over'}
          </p>
          <Button id="back-games-btn" variant="secondary" onClick={() => navigate('/games')}>
            Back to Games
          </Button>
        </div>
      )}

      {/* Lobby section (waiting / ready) */}
      {!isPlaying && !isFinished && (
        <>
          {/* Mise en Yen (¥) — Banque des 6 Lances */}
          <section
            aria-labelledby="stake-heading"
            className="rounded-card bg-surface-800 border border-gold-500/25 p-4 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-gold-400" aria-hidden="true" />
                <h2 id="stake-heading" className="text-sm font-bold text-slate-100">
                  Mise en ¥ — Banque des 6 Lances
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-gold-500/15 border border-gold-500/35 text-gold-300">
                {activeStake === 0
                  ? '0 ¥ · Partie Amicale'
                  : `Mise : ${formatYen(activeStake)} · Pot : ${formatYen(activeStake * Math.max(2, room.players.length))}`}
              </span>
            </div>

            {(isHost || isAdmin) ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_YEN_STAKES.map((amount) => {
                    const active = activeStake === amount
                    return (
                      <Button
                        key={amount}
                        type="button"
                        size="sm"
                        variant={active ? 'primary' : 'secondary'}
                        disabled={pendingStake}
                        onClick={() => void handleStakeChange(amount)}
                      >
                        {amount === 0 ? '0 ¥ (Amical)' : formatYen(amount)}
                      </Button>
                    )
                  })}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-700/70">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300">
                      <Shield className="size-3.5" aria-hidden="true" />
                      Mise libre Admin :
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Ex: 50000"
                      value={customStakeInput}
                      onChange={(e) => setCustomStakeInput(e.target.value)}
                      aria-label="Mise personnalisée Admin en ¥"
                      className="w-36 px-2.5 py-1 rounded-btn bg-surface-900 border border-surface-600 text-xs font-mono text-slate-100"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pendingStake}
                      onClick={() => {
                        const val = parseInt(customStakeInput, 10)
                        if (!Number.isFinite(val) || val < 0) {
                          toast('Montant invalide.', 'error')
                          return
                        }
                        void handleStakeChange(val)
                      }}
                    >
                      Appliquer mise
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Vérifiez la mise engagée avant de cliquer sur <strong>Mark as Ready</strong>.
              </p>
            )}
          </section>

          {/* Players list */}
          <section aria-labelledby="players-heading">
            <h2
              id="players-heading"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"
            >
              Players — {room.players.length} / {room.maxPlayers}
            </h2>

            {room.players.length <= 1 ? (
              <EmptyRoomState />
            ) : (
              <div className="flex flex-col gap-2">
                {room.players.map((player) => (
                  <RoomPlayerCard
                    key={player.userId}
                    player={player}
                    isHost={player.userId === room.hostId}
                    isCurrentUser={player.userId === user?.id}
                    isOnline={isOnline(player.userId)}
                    viewerIsHost={isHost}
                    isKicking={pendingKick === player.userId}
                    onKick={handleKick}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {/* Ready toggle (non-host or anyone) */}
            <ReadyToggle
              isReady={isReady}
              isLoading={pendingReady}
              onToggle={handleReady}
              disabled={isPlaying}
            />

            {/* Launch — host only when state=ready */}
            {canLaunch && (
              <Button
                id="launch-game-btn"
                variant="primary"
                size="md"
                isLoading={pendingLaunch}
                onClick={handleLaunch}
                leftIcon={<Rocket className="size-4" aria-hidden="true" />}
                className="animate-pulse-glow"
              >
                Launch Game!
              </Button>
            )}

            {/* Invite friends */}
            <Button
              id="open-invite-modal"
              variant="secondary"
              size="md"
              onClick={() => setIsInviteOpen(true)}
              leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
              disabled={room.players.length >= room.maxPlayers}
            >
              Invite Friends
            </Button>

            {/* Customize Player Cards */}
            <CardThemeSelector mode="modal" compact />

            {/* Leave */}
            <Button
              id="leave-room-btn"
              variant="ghost"
              size="md"
              isLoading={pendingLeave}
              onClick={handleLeave}
              leftIcon={<LogOut className="size-4" aria-hidden="true" />}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {isHost ? 'Dissolve Room' : 'Leave Room'}
            </Button>
          </div>
        </>
      )}

      {/* Invite modal */}
      <InviteModal
        roomId={roomId}
        gameSlug={room.gameSlug}
        outgoingInvites={outgoingInvites}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  )
}
