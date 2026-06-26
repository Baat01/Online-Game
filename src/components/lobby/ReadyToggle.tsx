import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ReadyToggleProps {
  isReady: boolean
  isLoading?: boolean
  onToggle: (ready: boolean) => void
  disabled?: boolean
}

/**
 * Toggle button to mark self as ready or unready in a game room lobby.
 */
export function ReadyToggle({ isReady, isLoading = false, onToggle, disabled = false }: ReadyToggleProps) {
  return (
    <Button
      id="ready-toggle"
      variant={isReady ? 'secondary' : 'primary'}
      size="md"
      isLoading={isLoading}
      disabled={disabled}
      onClick={() => onToggle(!isReady)}
      leftIcon={isReady ? <Check className="size-4" aria-hidden="true" /> : undefined}
      aria-pressed={isReady}
      className={isReady ? 'border-brand-500/50 text-brand-300' : ''}
    >
      {isReady ? 'Ready ✓' : 'Mark as Ready'}
    </Button>
  )
}
