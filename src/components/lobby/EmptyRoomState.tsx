import { Users } from 'lucide-react'

/**
 * Shown in the room when only the host is present.
 */
export function EmptyRoomState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="size-14 rounded-2xl bg-surface-700 flex items-center justify-center">
        <Users className="size-7 text-slate-500" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold text-slate-300">Waiting for players</p>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        Invite friends using the button below. The game starts when everyone is ready.
      </p>
    </div>
  )
}
