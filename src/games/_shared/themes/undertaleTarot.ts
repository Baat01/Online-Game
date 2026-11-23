import type { Rank, Suit } from '../deck'

export interface TarotArcanum {
  number: number
  roman: string
  name: string
  arcanaTitle: string
  imagePath: string
}

export const UNDERTALE_TAROT_ARCANA: TarotArcanum[] = [
  { number: 0, roman: '0', name: 'Human', arcanaTitle: 'The Fool', imagePath: '/themes/undertale-tarot/0.jpg' },
  { number: 1, roman: 'I', name: 'Asriel', arcanaTitle: 'The Magician', imagePath: '/themes/undertale-tarot/1.jpg' },
  { number: 2, roman: 'II', name: 'Alphys', arcanaTitle: 'The High Priestess', imagePath: '/themes/undertale-tarot/2.jpg' },
  { number: 3, roman: 'III', name: 'Toriel', arcanaTitle: 'The Empress', imagePath: '/themes/undertale-tarot/3.jpg' },
  { number: 4, roman: 'IV', name: 'Asgore', arcanaTitle: 'The Emperor', imagePath: '/themes/undertale-tarot/4.jpg' },
  { number: 5, roman: 'V', name: 'Papyrus', arcanaTitle: 'The Hierophant', imagePath: '/themes/undertale-tarot/5.jpg' },
  { number: 6, roman: 'VI', name: 'Royal Guards', arcanaTitle: 'The Lovers', imagePath: '/themes/undertale-tarot/6.jpg' },
  { number: 7, roman: 'VII', name: 'The Undying', arcanaTitle: 'The Chariot', imagePath: '/themes/undertale-tarot/7.jpg' },
  { number: 8, roman: 'VIII', name: 'Greater Dog', arcanaTitle: 'Strength', imagePath: '/themes/undertale-tarot/8.jpg' },
  { number: 9, roman: 'IX', name: 'Gerson', arcanaTitle: 'The Hermit', imagePath: '/themes/undertale-tarot/9.jpg' },
  { number: 10, roman: 'X', name: 'Temmie', arcanaTitle: 'Wheel of Fortune', imagePath: '/themes/undertale-tarot/10.jpg' },
  { number: 11, roman: 'XI', name: 'Undyne', arcanaTitle: 'Justice', imagePath: '/themes/undertale-tarot/11.jpg' },
  { number: 12, roman: 'XII', name: 'Flowey', arcanaTitle: 'The Hanged Man', imagePath: '/themes/undertale-tarot/12.jpg' },
  { number: 13, roman: 'XIII', name: 'Absolute God of Hyperdeath', arcanaTitle: 'Death', imagePath: '/themes/undertale-tarot/13.jpg' },
  { number: 14, roman: 'XIV', name: 'Muffet', arcanaTitle: 'Temperance', imagePath: '/themes/undertale-tarot/14.jpg' },
  { number: 15, roman: 'XV', name: 'Chara', arcanaTitle: 'The Devil', imagePath: '/themes/undertale-tarot/15.jpg' },
  { number: 16, roman: 'XVI', name: 'Omega Flowey', arcanaTitle: 'The Tower', imagePath: '/themes/undertale-tarot/16.jpg' },
  { number: 17, roman: 'XVII', name: 'Mettaton', arcanaTitle: 'The Star', imagePath: '/themes/undertale-tarot/17.jpg' },
  { number: 18, roman: 'XVIII', name: 'Napstablook', arcanaTitle: 'The Moon', imagePath: '/themes/undertale-tarot/18.jpg' },
  { number: 19, roman: 'XIX', name: 'Grillby', arcanaTitle: 'The Sun', imagePath: '/themes/undertale-tarot/19.jpg' },
  { number: 20, roman: 'XX', name: 'Sans', arcanaTitle: 'Judgement', imagePath: '/themes/undertale-tarot/20.jpg' },
  { number: 21, roman: 'XXI', name: 'Mt. Ebott', arcanaTitle: 'The World', imagePath: '/themes/undertale-tarot/21.jpg' },
]

const SUIT_INDEX: Record<Suit, number> = {
  hearts: 0,
  diamonds: 1,
  spades: 2,
  clubs: 3,
}

const RANK_INDEX: Record<string, number> = {
  A: 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  J: 10,
  Q: 11,
  K: 12,
}

export function getTarotArcanaForCard(suit: Suit, rank: Rank | string): TarotArcanum {
  const sIdx = SUIT_INDEX[suit] ?? 0
  const rIdx = RANK_INDEX[String(rank)] ?? 0
  const index = (sIdx * 13 + rIdx) % UNDERTALE_TAROT_ARCANA.length
  return UNDERTALE_TAROT_ARCANA[index]
}
