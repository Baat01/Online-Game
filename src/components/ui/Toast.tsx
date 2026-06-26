import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clsx } from 'clsx'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timerRefs.current[id])
    delete timerRefs.current[id]
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `toast-${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }])
      timerRefs.current[id] = setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  // Cleanup timers on unmount
  useEffect(() => {
    const refs = timerRefs.current
    return () => {
      Object.values(refs).forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─────────────────────────────────────────────
// Single Toast Item
// ─────────────────────────────────────────────

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle; classes: string }
> = {
  success: {
    icon: CheckCircle,
    classes: 'border-brand-500/40 bg-brand-500/10 text-brand-300',
  },
  error: {
    icon: XCircle,
    classes: 'border-red-500/40 bg-red-500/10 text-red-300',
  },
  info: {
    icon: Info,
    classes: 'border-surface-600 bg-surface-800 text-slate-200',
  },
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { icon: Icon, classes } = variantConfig[t.variant]

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 p-3 rounded-card border',
        'shadow-xl shadow-black/30 animate-slide-up',
        classes,
      )}
    >
      <Icon className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm leading-snug">{t.message}</p>
      <button
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
