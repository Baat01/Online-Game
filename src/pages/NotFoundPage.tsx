import { Link } from 'react-router-dom'
import { Spade, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * 404 Not Found page.
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <div className="text-8xl font-black text-surface-700 select-none" aria-hidden="true">
        404
      </div>
      <Spade className="size-10 text-brand-500/40 fill-brand-500/40 my-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-slate-200 mb-2">Page Not Found</h1>
      <p className="text-slate-400 mb-8 max-w-sm">
        This page folded. Head back home and deal again.
      </p>
      <Link to="/">
        <Button
          id="not-found-home-btn"
          variant="secondary"
          leftIcon={<ArrowLeft className="size-4" />}
        >
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
