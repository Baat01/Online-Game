import clsx from 'clsx'
import type { Card } from '../types/blackjack'

interface Props {
  cards: Card[]
  stacked?: boolean
}

export function CardStack({ cards, stacked = true }: Props) {
  return (
    <div className={clsx('flex', stacked ? '-space-x-8' : 'space-x-2')}>
      {cards.map((card, i) => (
        <div
          key={i}
          className={clsx(
            'relative w-16 h-24 sm:w-20 sm:h-32 rounded-lg shadow-md border-2 bg-white flex flex-col justify-between p-1 select-none transition-transform hover:-translate-y-2',
            card.isHidden ? 'bg-indigo-600 border-indigo-400' : 'border-slate-200'
          )}
          style={{ zIndex: i }}
        >
          {card.isHidden ? (
            <div className="w-full h-full border-2 border-indigo-400 rounded bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
          ) : (
            <>
              <div className={clsx('text-xs sm:text-sm font-bold', getSuitColor(card.suit))}>
                {card.rank}
                <br />
                {getSuitSymbol(card.suit)}
              </div>
              <div
                className={clsx(
                  'text-2xl sm:text-4xl self-center transform -translate-y-2',
                  getSuitColor(card.suit)
                )}
              >
                {getSuitSymbol(card.suit)}
              </div>
              <div
                className={clsx(
                  'text-xs sm:text-sm font-bold rotate-180',
                  getSuitColor(card.suit)
                )}
              >
                {card.rank}
                <br />
                {getSuitSymbol(card.suit)}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function getSuitColor(suit: string) {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-slate-900'
}

function getSuitSymbol(suit: string) {
  switch (suit) {
    case 'hearts': return '♥'
    case 'diamonds': return '♦'
    case 'clubs': return '♣'
    case 'spades': return '♠'
    default: return ''
  }
}
