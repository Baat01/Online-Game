import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogOut, Rocket, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRoom, useOutgoingInvites, useLobby } from '@/hooks/useLobby'
import { usePresence } from '@/hooks/usePresence'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { RoomHeader } from '@/components/lobby/RoomHeader'
import { RoomPlayerCard } from '@/components/lobby/RoomPlayerCard'
import { ReadyToggle } from '@/components/lobby/ReadyToggle'
import { InviteModal } from '@/components/lobby/InviteModal'
import { EmptyRoomState } from '@/components/lobby/EmptyRoomState'
import { RoomPageSkeleton } from '@/components/lobby/LobbySkeleton'

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
  const { user } = useAuth()
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

  // ── Derived state ────────────────────────────────────────────────────────
  const isHost = user?.id === room?.hostId
  const myPlayer = room?.players.find((p) => p.userId === user?.id)
  const isReady = myPlayer?.ready ?? false
  const canLaunch = isHost && room?.state === 'ready'
  const isPlaying = room?.state === 'playing'
  const isFinished = room?.state === 'finished' || room?.state === 'cancelled'

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
      // Phase 4: navigate to game view here
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
        <div className="rounded-card bg-gold-500/10 border border-gold-500/25 p-6 text-center animate-slide-up">
          <p className="text-gold-400 font-semibold text-lg mb-1">🃏 Game in Progress</p>
          <p className="text-sm text-slate-400">
            Phase 4 will implement the Blackjack table here. Hang tight!
          </p>
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
