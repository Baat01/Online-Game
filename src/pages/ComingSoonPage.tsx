import { Hammer } from 'lucide-react'

interface ComingSoonPageProps {
  /** Name of the feature/page that isn't ready yet */
  feature?: string
}

/**
 * Placeholder page for routes that will be built in future phases.
 */
export function ComingSoonPage({ feature }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <div className="size-16 rounded-2xl bg-gold-400/10 flex items-center justify-center mb-6">
        <Hammer className="size-8 text-gold-400" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-slate-200 mb-2">
        {feature ? `${feature} — Coming Soon` : 'Coming Soon'}
      </h1>
      <p className="text-slate-400 max-w-sm">
        This feature is under construction. Stay tuned — it&apos;ll be worth the wait.
      </p>
      <div className="mt-8 flex gap-2 items-center text-xs text-slate-500">
        <div className="size-2 rounded-full bg-brand-500 animate-pulse" />
        Work in progress
      </div>
    </div>
  )
}
