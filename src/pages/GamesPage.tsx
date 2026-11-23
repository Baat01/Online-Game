import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Coins,
  Dices,
  Eye,
  Gamepad2,
  Globe,
  Lock,
  Play,
  Radio,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { GAME_REGISTRY, getGameBySlug } from '@/games/registry'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { useLobby } from '@/hooks/useLobby'
import { useAuth } from '@/hooks/useAuth'
import { GameCard } from '@/components/lobby/GameCard'
import { InvitationCenter } from '@/components/lobby/InvitationCenter'
import { GamesPageSkeleton } from '@/components/lobby/LobbySkeleton'
import { CardThemeSelector, GameRulesModal } from '@/games/_shared/components'
import {
  DEFAULT_YEN_BALANCE,
  formatYen,
  getRoomStake,
  resolveUserPermissions,
} from '@/services/wallet/walletService'
import type { GameRoom } from '@/types/lobby'

function getPlayPath(room: GameRoom): string {
  return room.gameSlug === 'blackjack'
    ? `/room/${room.id}/play`
    : `/room/${room.id}/play/${room.gameSlug}`
}

/**
 * Games page — /games (protected).
 *
 * Displays:
 *  - Pending invitations
 *  - Open public rooms & ongoing matches ("Salons Ouverts & Parties en Cours")
 *    including a priority banner to resume the user's own active match
 *  - All registered games with Create Room, Public/Private selector, and Rules modal
 */
export function GamesPage() {
  const {
    invites = [],
    publicRooms = [],
    myActiveRooms = [],
    isInvitesLoading,
    isCreatingRoom,
    createRoom,
    joinRoom,
    deleteRoom,
    accept,
    decline,
  } = useLobby({ includePublicRooms: true })

  const { toast } = useToast()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [creatingSlug, setCreatingSlug] = useState<string | null>(null)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [pendingAccept, setPendingAccept] = useState<string | null>(null)
  const [pendingDecline, setPendingDecline] = useState<string | null>(null)
  const [createAsPublic, setCreateAsPublic] = useState(true)
  const [rulesSlug, setRulesSlug] = useState<string | null>(null)

  const userPerms = resolveUserPermissions(profile)
  const myBalance = profile?.yen_balance ?? DEFAULT_YEN_BALANCE
  const isAdmin = Boolean(profile?.is_admin)

  const canDeleteRoom = (room: GameRoom) => Boolean(isAdmin || room.hostId === user?.id)

  const handleDeleteRoom = async (roomId: string) => {
    if (!deleteRoom) return
    setDeletingRoomId(roomId)
    try {
      await deleteRoom(roomId)
      setConfirmDeleteRoomId(null)
      toast('Salon supprimé.', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Impossible de supprimer le salon.', 'error')
    } finally {
      setDeletingRoomId(null)
    }
  }

  const renderDeleteControls = (room: GameRoom) => {
    if (!canDeleteRoom(room) || !deleteRoom) return null
    if (confirmDeleteRoomId === room.id) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/40">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            isLoading={deletingRoomId === room.id}
            onClick={() => void handleDeleteRoom(room.id)}
            className="text-red-300 hover:text-white hover:bg-red-600/80 px-2 py-0.5 text-xs"
          >
            Confirmer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={deletingRoomId === room.id}
            onClick={() => setConfirmDeleteRoomId(null)}
            className="text-slate-300 hover:text-white px-2 py-0.5 text-xs"
          >
            Annuler
          </Button>
        </div>
      )
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Supprimer le salon ${room.id}`}
        onClick={() => setConfirmDeleteRoomId(room.id)}
        leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
        className="text-red-400 hover:text-red-200 hover:bg-red-500/15"
      >
        Supprimer
      </Button>
    )
  }

  const handleCreateRoom = async (gameSlug: string) => {
    const plugin = getGameBySlug(gameSlug)
    setCreatingSlug(gameSlug)
    try {
      await createRoom(gameSlug, plugin?.maxPlayers ?? 6, createAsPublic)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create room.', 'error')
    } finally {
      setCreatingSlug(null)
    }
  }

  const handleJoinPublicRoom = async (room: GameRoom) => {
    const alreadySeated = room.players.some((p) => p.userId === user?.id)
    if (alreadySeated) {
      navigate(room.state === 'playing' ? getPlayPath(room) : `/room/${room.id}`)
      return
    }

    const stake = getRoomStake(room)
    if (stake > 0 && !userPerms.unlimited_yen && myBalance < stake) {
      toast(
        `Solde insuffisant (${formatYen(myBalance)}) pour rejoindre cette salle (${formatYen(stake)} requis).`,
        'error',
      )
      return
    }

    if (!joinRoom) {
      navigate(`/room/${room.id}`)
      return
    }

    setJoiningRoomId(room.id)
    try {
      await joinRoom(room.id)
      navigate(room.state === 'playing' ? getPlayPath(room) : `/room/${room.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Impossible de rejoindre la salle.', 'error')
    } finally {
      setJoiningRoomId(null)
    }
  }

  const handleAccept = async (inviteId: string) => {
    setPendingAccept(inviteId)
    try {
      await accept(inviteId)
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
  const publicWaitingRooms = publicRooms.filter(
    (r) => r.state === 'waiting' || r.state === 'ready',
  )
  const publicPlayingRooms = publicRooms.filter((r) => r.state === 'playing')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="size-5 text-brand-400" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-100">Games</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300">
              Cercle Engei 宴芸
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Choisissez une table, rejoignez un salon public ou invitez un rival avec mise en ¥ (ou à 0 ¥).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface-800 border border-gold-500/30 text-gold-300 text-xs font-mono font-semibold">
            <Coins className="size-3.5 text-gold-400" aria-hidden="true" />
            <span>
              {formatYen(myBalance, Boolean(profile?.is_admin), true)}
            </span>
          </div>
          <NavLink
            to="/quick-draw"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface-800 border border-surface-600 hover:border-gold-400/70 text-slate-200 text-xs font-semibold no-underline transition-colors"
          >
            <Dices className="size-3.5 text-gold-400" aria-hidden="true" />
            Tirage Libre
          </NavLink>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<BookOpen className="size-3.5" aria-hidden="true" />}
            onClick={() => setRulesSlug('23e-arcane')}
          >
            Règles
          </Button>
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

      {/* Priority Banner: Mes parties en cours */}
      {myActiveRooms.length > 0 && (
        <section
          aria-label="Mes parties en cours"
          data-testid="my-active-rooms-banner"
          className="rounded-2xl bg-gradient-to-r from-gold-500/15 via-surface-800 to-brand-500/15 border-2 border-gold-400/55 p-4 space-y-3 shadow-lg"
        >
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gold-300">
            <RotateCcw className="size-4 animate-spin [animation-duration:8s]" aria-hidden="true" />
            <span>Mes parties en cours ({myActiveRooms.length})</span>
          </div>

          <div className="space-y-2">
            {myActiveRooms.map((room) => {
              const plugin = getGameBySlug(room.gameSlug)
              const stake = getRoomStake(room)
              const opponentNames = room.players
                .filter((p) => p.userId !== user?.id)
                .map((p) => p.profile.display_name || p.profile.username)
              const target = room.state === 'playing' ? getPlayPath(room) : `/room/${room.id}`
              return (
                <div
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-900/90 border border-gold-500/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100">
                        {plugin?.name ?? room.gameSlug}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[11px] font-bold',
                          room.state === 'playing'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
                        )}
                      >
                        {room.state === 'playing' ? 'En cours' : 'En attente'}
                      </span>
                      <span className="text-xs font-mono text-gold-300">
                        {stake === 0 ? '0 ¥ (Amical)' : formatYen(stake)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {opponentNames.length > 0
                        ? `Face à ${opponentNames.join(', ')}`
                        : `Salle ${room.players.length}/${room.maxPlayers} joueur(s)`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      leftIcon={<Play className="size-3.5" aria-hidden="true" />}
                      onClick={() => navigate(target)}
                    >
                      Reprendre la partie en cours
                    </Button>
                    {renderDeleteControls(room)}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Live Section: Salons Ouverts & Parties en Cours */}
      <section
        aria-labelledby="open-rooms-heading"
        data-testid="public-rooms-section"
        className="rounded-2xl bg-surface-800/80 border border-surface-700 p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-emerald-400 animate-pulse" aria-hidden="true" />
            <h2 id="open-rooms-heading" className="text-base font-bold text-slate-100">
              Salons Ouverts &amp; Parties en Cours
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {publicWaitingRooms.length} en attente · {publicPlayingRooms.length} en cours
          </span>
        </div>

        {/* Salles publiques en attente */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Salles publiques en attente ({publicWaitingRooms.length})
          </h3>
          {publicWaitingRooms.length === 0 ? (
            <p className="text-xs text-slate-500 bg-surface-900/60 border border-surface-700/60 rounded-xl px-3.5 py-2.5">
              Aucun salon public en attente pour le moment. Créez une salle publique ci-dessous !
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {publicWaitingRooms.map((room) => {
                const plugin = getGameBySlug(room.gameSlug)
                const host = room.players.find((p) => p.userId === room.hostId)
                const hostName = host?.profile.display_name || host?.profile.username || 'Hôte'
                const hostClan = host?.profile.clan_title
                const stake = getRoomStake(room)
                const isFull = room.players.length >= room.maxPlayers
                const isSeated = room.players.some((p) => p.userId === user?.id)

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-900/85 border border-surface-700 hover:border-gold-500/40 px-3.5 py-3 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-100 truncate">
                          {plugin?.name ?? room.gameSlug}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-gold-500/15 border border-gold-500/30 text-gold-300">
                          {stake === 0 ? '0 ¥' : formatYen(stake)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span>{hostName}</span>
                        {hostClan && (
                          <span className="px-1.5 py-0.2 rounded bg-brand-500/15 border border-brand-500/30 text-brand-300 text-[10px] font-semibold">
                            {hostClan}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                          <Users className="size-3" aria-hidden="true" />
                          {room.players.length}/{room.maxPlayers}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSeated ? 'secondary' : 'primary'}
                        isLoading={joiningRoomId === room.id}
                        disabled={isFull && !isSeated}
                        onClick={() => void handleJoinPublicRoom(room)}
                      >
                        {isSeated ? 'Entrer' : isFull ? 'Complet' : 'Rejoindre'}
                      </Button>
                      {renderDeleteControls(room)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Salles publiques en cours */}
        {publicPlayingRooms.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-700/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Salles publiques en cours ({publicPlayingRooms.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {publicPlayingRooms.map((room) => {
                const plugin = getGameBySlug(room.gameSlug)
                const stake = getRoomStake(room)
                const names = room.players.map(
                  (p) => p.profile.display_name || p.profile.username,
                )
                const hasFreeSeat = room.players.length < room.maxPlayers
                const isSeated = room.players.some((p) => p.userId === user?.id)

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-900/85 border border-surface-700 px-3.5 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-100 truncate">
                          {plugin?.name ?? room.gameSlug}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                          En duel
                        </span>
                        <span className="text-xs font-mono text-gold-300">
                          {stake === 0 ? '0 ¥' : formatYen(stake)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {names.join(' vs ') || 'Partie en cours'} · {room.players.length}/
                        {room.maxPlayers}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSeated ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => navigate(getPlayPath(room))}
                        >
                          Reprendre
                        </Button>
                      ) : hasFreeSeat ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          isLoading={joiningRoomId === room.id}
                          onClick={() => void handleJoinPublicRoom(room)}
                        >
                          Rejoindre
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          leftIcon={<Eye className="size-3.5" aria-hidden="true" />}
                          onClick={() => navigate(getPlayPath(room))}
                        >
                          Observer
                        </Button>
                      )}
                      {renderDeleteControls(room)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Room Creation Visibility Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Créer une nouvelle table
        </h2>
        <div
          role="group"
          aria-label="Visibilité de la salle créée"
          className="inline-flex items-center rounded-xl bg-surface-800 border border-surface-700 p-1 gap-1"
        >
          <button
            type="button"
            onClick={() => setCreateAsPublic(true)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              createAsPublic
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <Globe className="size-3.5" aria-hidden="true" />
            Salle Publique
          </button>
          <button
            type="button"
            onClick={() => setCreateAsPublic(false)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              !createAsPublic
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <Lock className="size-3.5" aria-hidden="true" />
            Salle Privée
          </button>
        </div>
      </div>

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
              onOpenRules={(slug) => setRulesSlug(slug)}
            />
          ))}
        </div>
      )}

      {/* Centralized Game Rules Modal */}
      <GameRulesModal
        isOpen={rulesSlug !== null}
        initialGameSlug={rulesSlug}
        onClose={() => setRulesSlug(null)}
      />
    </div>
  )
}
