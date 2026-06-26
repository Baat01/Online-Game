import type { BlackjackGame } from '../types/blackjack'
import { CardStack } from './CardStack'

interface Props {
  game: BlackjackGame
}

export function DealerArea({ game }: Props) {
  // If no cards, don't show dealer area
  if (!game || game.dealer_hand.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-20 h-28 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white/30 font-medium">Dealer</span>
        </div>
      </div>
    )
  }

  // Check if dealer hand has a hidden card
  const hasHidden = game.dealer_hand.some(c => c.isHidden)

  return (
    <div className="flex flex-col items-center py-6 gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Dealer</h2>
        {!hasHidden && game.dealer_score > 0 && (
          <span className="bg-white/10 text-white/90 text-xs px-2 py-0.5 rounded-full font-mono">
            {game.dealer_score}
          </span>
        )}
      </div>

      <CardStack cards={game.dealer_hand} stacked={false} />
    </div>
  )
}
