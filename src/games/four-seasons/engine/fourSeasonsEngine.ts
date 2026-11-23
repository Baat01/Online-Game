import {
  createStandardDeck,
  shuffleDeck,
  drawCards,
  type Card,
  type Suit,
} from '../../_shared/deck'
import { getNextTurn } from '../../_shared/turnHelpers'
import type { RngFn } from '../../_shared/randomUtils'
import type { BaseGameState } from '@/types/game'

export interface FourSeasonsPlayer {
  userId: string
  hand: Card[]
}

export interface FourSeasonsState extends BaseGameState {
  playersRecord: Record<string, FourSeasonsPlayer>
  deck: Card[]
  discardPile: Card[]
  activeSeason: Suit
  winnerId: string | null
  lastEffectText?: string | null
}

export const SEASON_ORDER: Record<Suit, Suit> = {
  hearts: 'diamonds',
  diamonds: 'spades',
  spades: 'clubs',
  clubs: 'hearts',
}

export const SEASON_META: Record<Suit, { name: string; emoji: string; badgeClass: string }> = {
  hearts: {
    name: 'Spring',
    emoji: '🌸',
    badgeClass: 'bg-pink-500/20 border-pink-400/40 text-pink-200',
  },
  diamonds: {
    name: 'Summer',
    emoji: '☀️',
    badgeClass: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
  },
  spades: {
    name: 'Autumn',
    emoji: '🍂',
    badgeClass: 'bg-orange-500/20 border-orange-400/40 text-orange-200',
  },
  clubs: {
    name: 'Winter',
    emoji: '❄️',
    badgeClass: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
  },
}

export function isFaceCard(card: Card): boolean {
  return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
}

export function dealInitialHands(
  players: string[],
  hostId: string,
  rng: RngFn = Math.random,
): FourSeasonsState {
  let deck = shuffleDeck(createStandardDeck(), rng)

  const playersRecord: Record<string, FourSeasonsPlayer> = {}

  for (const id of players) {
    const drawP = drawCards(deck, 4)
    deck = drawP.remaining
    playersRecord[id] = {
      userId: id,
      hand: drawP.drawn.map((c) => ({ ...c, ownerId: id })),
    }
  }

  const drawDiscard = drawCards(deck, 1)
  deck = drawDiscard.remaining
  const discardPile = drawDiscard.drawn
  const activeSeason = discardPile[0]?.suit ?? 'hearts'

  return {
    status: 'player_turns',
    players: [],
    currentTurnUserId: hostId,
    roundNumber: 1,
    playersRecord,
    deck,
    discardPile,
    activeSeason,
    winnerId: null,
    lastEffectText: null,
  }
}

export function canPlayCard(card: Card, activeSeason: Suit, isLastCard: boolean): boolean {
  // Cannot end game with a face card (Jack, Queen, King)
  if (isLastCard && isFaceCard(card)) {
    return false
  }

  // King overrides suit constraint
  if (card.rank === 'K') return true

  // Follow seasonal order (current season or advancing to the next season)
  return card.suit === SEASON_ORDER[activeSeason] || card.suit === activeSeason
}

export function validateMove(
  state: FourSeasonsState,
  userId: string,
  cardId?: string,
): boolean {
  if (state.status !== 'player_turns') return false
  if (state.currentTurnUserId !== userId) return false
  const player = state.playersRecord[userId]
  if (!player) return false

  if (cardId !== undefined) {
    const card = player.hand.find((c) => c.id === cardId)
    if (!card) return false
    return canPlayCard(card, state.activeSeason, player.hand.length === 1)
  }

  return true
}

function replenishDeckIfEmpty(
  deck: Card[],
  discardPile: Card[],
  rng: RngFn,
): { deck: Card[]; discardPile: Card[] } {
  if (deck.length > 0 || discardPile.length <= 1) {
    return { deck, discardPile }
  }
  const topCard = discardPile[discardPile.length - 1]
  const rest = discardPile.slice(0, -1)
  return {
    deck: shuffleDeck(rest, rng),
    discardPile: [topCard],
  }
}

export function checkWinCondition(state: FourSeasonsState): FourSeasonsState {
  for (const player of Object.values(state.playersRecord)) {
    if (player.hand.length === 0) {
      return {
        ...state,
        status: 'finished',
        winnerId: player.userId,
      }
    }
  }
  return state
}

export function applyEffect(
  state: FourSeasonsState,
  card: Card,
  _userId: string,
  newSeasonChoice?: Suit,
  rng: RngFn = Math.random,
): { state: FourSeasonsState; skipOpponentTurn: boolean } {
  let workingDeck = [...state.deck]
  let workingDiscard = [...state.discardPile]
  let activeSeason: Suit = card.suit
  let skipOpponentTurn = false
  let lastEffectText: string | null = null

  const nextPlayersRecord: Record<string, FourSeasonsPlayer> = {}
  for (const [pid, p] of Object.entries(state.playersRecord)) {
    nextPlayersRecord[pid] = { ...p, hand: [...p.hand] }
  }

  if (card.rank === 'J') {
    lastEffectText = 'Jack played — both players draw 1 card!'
    for (const pid of Object.keys(nextPlayersRecord)) {
      const replenished = replenishDeckIfEmpty(workingDeck, workingDiscard, rng)
      workingDeck = replenished.deck
      workingDiscard = replenished.discardPile
      if (workingDeck.length > 0) {
        const drawn = drawCards(workingDeck, 1)
        workingDeck = drawn.remaining
        nextPlayersRecord[pid].hand.push({ ...drawn.drawn[0], ownerId: pid })
      }
    }
  } else if (card.rank === 'Q') {
    skipOpponentTurn = true
    lastEffectText = 'Queen played — opponent turn skipped!'
  } else if (card.rank === 'K') {
    if (newSeasonChoice) {
      activeSeason = newSeasonChoice
    }
    lastEffectText = `King played — season shifted to ${SEASON_META[activeSeason].name}!`
  }

  return {
    state: {
      ...state,
      deck: workingDeck,
      discardPile: workingDiscard,
      activeSeason,
      playersRecord: nextPlayersRecord,
      lastEffectText,
    },
    skipOpponentTurn,
  }
}

export function drawCard(
  state: FourSeasonsState,
  userId: string,
  rng: RngFn = Math.random,
): FourSeasonsState {
  if (!validateMove(state, userId)) return state

  const { deck: workingDeck, discardPile: workingDiscard } = replenishDeckIfEmpty(
    state.deck,
    state.discardPile,
    rng,
  )

  if (workingDeck.length === 0) return state

  const { remaining, drawn } = drawCards(workingDeck, 1)
  const player = state.playersRecord[userId]

  return {
    ...state,
    deck: remaining,
    discardPile: workingDiscard,
    currentTurnUserId: getNextTurn(Object.keys(state.playersRecord), userId),
    lastEffectText: null,
    playersRecord: {
      ...state.playersRecord,
      [userId]: {
        ...player,
        hand: [...player.hand, { ...drawn[0], ownerId: userId }],
      },
    },
  }
}

export function playCard(
  state: FourSeasonsState,
  userId: string,
  cardId: string,
  newSeasonChoice?: Suit,
  rng: RngFn = Math.random,
): FourSeasonsState {
  if (!validateMove(state, userId, cardId)) return state

  const player = state.playersRecord[userId]
  const cardIndex = player.hand.findIndex((c) => c.id === cardId)
  if (cardIndex === -1) return state

  const card = { ...player.hand[cardIndex], ownerId: userId }
  const newHand = player.hand.filter((_, i) => i !== cardIndex)

  const afterDiscard: FourSeasonsState = {
    ...state,
    discardPile: [...state.discardPile, card],
    playersRecord: {
      ...state.playersRecord,
      [userId]: {
        ...player,
        hand: newHand,
      },
    },
  }

  const checkedWin = checkWinCondition(afterDiscard)
  if (checkedWin.status === 'finished') {
    return checkedWin
  }

  const { state: afterEffect, skipOpponentTurn } = applyEffect(
    checkedWin,
    card,
    userId,
    newSeasonChoice,
    rng,
  )

  return {
    ...afterEffect,
    currentTurnUserId: skipOpponentTurn
      ? userId
      : getNextTurn(Object.keys(state.playersRecord), userId),
  }
}
