import type { Card, CardSuit, CardRank, BlackjackGame, BlackjackPlayer, BlackjackPlayerState } from '../types/blackjack'

const SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank, 10)
      if (['J', 'Q', 'K'].includes(rank)) value = 10
      if (rank === 'A') value = 11
      deck.push({ suit, rank, value })
    }
  }
  return deck
}

export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function calculateScore(hand: Card[]): number {
  let score = 0
  let aces = 0
  for (const card of hand) {
    if (card.isHidden) continue
    score += card.value
    if (card.rank === 'A') aces += 1
  }
  while (score > 21 && aces > 0) {
    score -= 10
    aces -= 1
  }
  return score
}

export function canHit(player: BlackjackPlayer, game: BlackjackGame): boolean {
  return (
    game.status === 'player_turn' &&
    game.current_turn === player.user_id &&
    player.state === 'playing' &&
    !player.busted &&
    !player.standing &&
    !player.blackjack
  )
}

export function canStand(player: BlackjackPlayer, game: BlackjackGame): boolean {
  return canHit(player, game)
}

/**
 * Returns the updated deck and the drawn cards.
 */
export function drawCards(deck: Card[], count: number): { remainingDeck: Card[]; drawn: Card[] } {
  if (deck.length < count) {
    // Basic auto-reshuffle logic if deck is exhausted
    const newDeck = shuffle(createDeck())
    return {
      remainingDeck: newDeck.slice(count),
      drawn: newDeck.slice(0, count)
    }
  }
  return {
    remainingDeck: deck.slice(count),
    drawn: deck.slice(0, count)
  }
}

/**
 * Initial deal: 2 cards to each player, 2 to dealer (1 hidden).
 */
export function deal(game: BlackjackGame, players: BlackjackPlayer[]): { game: BlackjackGame; players: BlackjackPlayer[] } {
  let currentDeck = shuffle(createDeck()) // Start fresh each round for simplicity
  
  const updatedPlayers = players.map(p => {
    const draw = drawCards(currentDeck, 2)
    currentDeck = draw.remainingDeck
    const hand = draw.drawn
    const score = calculateScore(hand)
    const blackjack = score === 21
    return {
      ...p,
      hand,
      score,
      blackjack,
      state: blackjack ? 'done' : 'playing',
      standing: blackjack,
    } as BlackjackPlayer
  })

  const dealerDraw = drawCards(currentDeck, 2)
  currentDeck = dealerDraw.remainingDeck
  const dealerHand = dealerDraw.drawn
  dealerHand[1].isHidden = true
  const dealerScore = calculateScore(dealerHand)

  return {
    game: {
      ...game,
      deck: currentDeck,
      dealer_hand: dealerHand,
      dealer_score: dealerScore,
    },
    players: updatedPlayers
  }
}

/**
 * Determines the next player whose turn it is, or returns null if all players are done.
 */
export function nextTurn(players: BlackjackPlayer[]): string | null {
  // Sort players by seat ascending
  const sorted = [...players].sort((a, b) => a.seat - b.seat)
  const nextPlayer = sorted.find(p => p.state === 'playing' && !p.busted && !p.standing && !p.blackjack)
  return nextPlayer ? nextPlayer.user_id : null
}

/**
 * Dealer plays out their hand. Dealer hits until >= 17.
 */
export function dealerPlay(game: BlackjackGame): BlackjackGame {
  let currentDeck = game.deck
  const dealerHand = [...game.dealer_hand]
  
  // Reveal hole card
  if (dealerHand.length > 1) {
    dealerHand[1].isHidden = false
  }

  let dealerScore = calculateScore(dealerHand)

  while (dealerScore < 17) {
    const draw = drawCards(currentDeck, 1)
    currentDeck = draw.remainingDeck
    dealerHand.push(draw.drawn[0])
    dealerScore = calculateScore(dealerHand)
  }

  return {
    ...game,
    deck: currentDeck,
    dealer_hand: dealerHand,
    dealer_score: dealerScore
  }
}

export type SettlementResult = 'win_blackjack' | 'win' | 'push' | 'lose' | 'lose_bust'

export function settle(player: BlackjackPlayer, dealerScore: number): SettlementResult {
  if (player.busted) return 'lose_bust'
  if (player.blackjack) {
    if (dealerScore === 21) return 'push' // Dealer also has blackjack
    return 'win_blackjack'
  }
  if (dealerScore > 21) return 'win' // Dealer busted
  if (player.score > dealerScore) return 'win'
  if (player.score === dealerScore) return 'push'
  return 'lose'
}

export function reset(game: BlackjackGame, players: BlackjackPlayer[]): { game: BlackjackGame, players: BlackjackPlayer[] } {
  return {
    game: {
      ...game,
      status: 'waiting',
      deck: [],
      dealer_hand: [],
      dealer_score: 0,
      current_turn: null,
      round: game.round + 1
    },
    players: players.map(p => ({
      ...p,
      hand: [],
      score: 0,
      state: 'waiting',
      blackjack: false,
      busted: false,
      standing: false
    }))
  }
}
