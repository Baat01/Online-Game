import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BellRing, Coins, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInvites, useLobby, useRoom } from '@/hooks/useLobby'
import { useToast } from '@/components/ui/Toast'
import { Avatar } from '@/components/friends/Avatar'
import { Button } from '@/components/ui/Button'
import { getGameBySlug } from '@/games/registry'
import { formatYen, getRoomStake } from '@/services/wallet/walletService'

function playInviteChime(): void {
  if (typeof window === 'undefined') return
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  try {
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.34)
    osc.onended = () => {
      void ctx.close().catch(() => {})
    }
  } catch {
    // Ignore audio restrictions in headless/muted contexts
  }
}

export function GlobalInvitationPopup() {
  const { user } = useAuth()
  const { data: invites = [] } = useInvites()
  const { accept, decline } = useLobby()
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [busyAction, setBusyAction] = useState<'accept' | 'decline' | null>(null)
  const chimedIdsRef = useRef<Set<string>>(new Set())

  const activeInvite = invites.find((inv) => {
    if (dismissedIds.includes(inv.id)) return false
    if (!inv.roomId) return true
    const onTargetRoom =
      location.pathname.includes(`/room/${inv.roomId}`) ||
      location.pathname.includes(`/games/room/${inv.roomId}`)
    return !onTargetRoom
  })

  const { data: inviteRoom } = useRoom(activeInvite?.roomId ?? '')
  const stakeYen = getRoomStake(inviteRoom)

  useEffect(() => {
    if (!activeInvite) return
    if (chimedIdsRef.current.has(activeInvite.id)) return
    chimedIdsRef.current.add(activeInvite.id)
    playInviteChime()
  }, [activeInvite])

  if (!user || !activeInvite) return null

  const game = getGameBySlug(activeInvite.gameSlug)
  const GameIcon = game?.icon ?? Sparkles
  const senderName =
    activeInvite.sender?.display_name ?? activeInvite.sender?.username ?? 'Un joueur ENGEI'

  const handleJoin = async () => {
    setBusyAction('accept')
    try {
      const roomId = await accept(activeInvite.id)
      setDismissedIds((prev) => [...prev, activeInvite.id])
      if (roomId) {
        navigate(`/games/room/${roomId}`)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Impossible de rejoindre la salle.", 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDecline = async () => {
    setBusyAction('decline')
    try {
      await decline(activeInvite.id)
      setDismissedIds((prev) => [...prev, activeInvite.id])
      toast('Invitation refusée.', 'info')
    } catch {
      toast("Impossible de refuser l'invitation.", 'error')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <aside
      role="dialog"
      aria-label="Invitation à une partie ENGEI"
      className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-surface-800 border-2 border-gold-500/60 shadow-2xl shadow-black/60 p-4 animate-slide-up"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400">
          <BellRing className="size-4 text-brand-400 animate-pulse" aria-hidden="true" />
          <span>Invitation ENGEI 宴芸</span>
        </div>
        <button
          type="button"
          onClick={() => setDismissedIds((prev) => [...prev, activeInvite.id])}
          aria-label="Masquer l'invitation"
          className="text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Avatar
          url={activeInvite.sender?.avatar_url ?? null}
          username={activeInvite.sender?.username ?? 'engei'}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100 truncate">{senderName}</p>
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400">
            <span>@{activeInvite.sender?.username ?? 'rival'}</span>
            {activeInvite.sender?.clan_title && (
              <span className="px-1.5 py-0.2 rounded bg-brand-500/15 border border-brand-500/30 text-brand-300 text-[10px] font-semibold">
                {activeInvite.sender.clan_title}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-900/80 border border-surface-700 mb-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
          <GameIcon className="size-3.5 text-brand-400" aria-hidden="true" />
          {game?.name ?? activeInvite.gameSlug}
        </span>
        <span className="inline-flex items-center gap-1 font-mono font-bold text-gold-300">
          <Coins className="size-3.5 text-gold-400" aria-hidden="true" />
          {stakeYen === 0 ? 'Partie Amicale — 0 ¥' : `Mise : ${formatYen(stakeYen)}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="primary"
          isLoading={busyAction === 'accept'}
          disabled={busyAction === 'decline'}
          onClick={() => void handleJoin()}
          className="flex-1"
        >
          Rejoindre la partie
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          isLoading={busyAction === 'decline'}
          disabled={busyAction === 'accept'}
          onClick={() => void handleDecline()}
        >
          Refuser
        </Button>
      </div>
    </aside>
  )
}
