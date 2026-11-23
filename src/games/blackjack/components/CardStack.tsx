import clsx from 'clsx'
import type { Card } from '../types/blackjack'
import { ThemedCard } from '../../_shared/components'

interface Props {
  cards: Card[]
  stacked?: boolean
  frontThemeId?: string
  backThemeId?: string
}

export function CardStack({ cards, stacked = true, frontThemeId, backThemeId }: Props) {
  return (
    <div className={clsx('flex', stacked ? '-space-x-8' : 'space-x-2')}>
      {cards.map((card, i) => (
        <div key={`${card.suit}-${card.rank}-${i}`} style={{ zIndex: i }}>
          <ThemedCard
            suit={card.suit}
            rank={card.rank}
            isHidden={card.isHidden}
            frontThemeId={frontThemeId}
            backThemeId={backThemeId}
            size="md"
            className="animate-deal-card hover:-translate-y-2"
          />
        </div>
      ))}
    </div>
  )
}
