import { Link } from 'react-router-dom'
import { Spade } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** Link shown below the form, e.g. "Already have an account?" */
  footer?: ReactNode
}

/**
 * Centered auth card — shared shell for Login and Register pages.
 */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-900">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-brand-500/6 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-100 no-underline font-bold text-xl mb-1 hover:text-brand-400 transition-colors"
          >
            <Spade className="size-7 text-brand-400 fill-brand-400" aria-hidden="true" />
            CardArena
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 mt-4 text-center">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1 text-center">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-surface-800 border border-surface-700 rounded-card p-6 shadow-2xl shadow-black/40">
          {children}
        </div>

        {/* Footer link */}
        {footer && (
          <div className="mt-5 text-center text-sm text-slate-400">{footer}</div>
        )}
      </div>
    </div>
  )
}
