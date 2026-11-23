import { createStandardDeck, shuffleDeck, drawCards, type Card } from '../../_shared/deck'
import { getNextTurn, getOpponentId } from '../../_shared/turnHelpers'
import type { RngFn } from '../../_shared/randomUtils'
import type { BaseGameState } from '@/types/game'

export interface TwistPlayer {
  userId: string
  hand: Card[]
  score: number
  hasStood: boolean
  busted: boolean
}

export interface TwistState extends BaseGameState {
  playersRecord: Record<string, TwistPlayer>
  deck: Card[]
  sharedHiddenCard: Card | null
  pendingCard: Card | null
  winnerId: string | null
  sharedRevealed: boolean
}

export function isFaceCard(card: Card): boolean {
  return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
}

export function createDeck(rng: RngFn = Math.random): Card[] {
  return shuffleDeck(createStandardDeck(), rng)
}

export function dealHiddenCard(deck: Card[]): { hiddenCard: Card; remainingDeck: Card[] } {
  const { drawn, remaining } = drawCards(deck, 1)
  if (drawn.length === 0) {
    throw new Error('Deck is empty; cannot deal hidden shared card')
  }
  return {
    hiddenCard: { ...drawn[0], isHidden: true },
    remainingDeck: remaining,
  }
}

export function calculateScore(
  hand: Card[],
  sharedHiddenCard: Card | null,
  sharedRevealed: boolean,
): number {
  let score = 0
  let aces = 0

  const cardValue = (card: Card): number => {
    if (typeof card.currentValue === 'number') {
      return card.currentValue
    }
    if (card.rank === 'A') {
      aces += 1
      return 11
    }
    if (isFaceCard(card)) {
      return 10
    }
    return parseInt(card.rank, 10)
  }

  for (const card of hand) {
    score += cardValue(card)
  }

  if (sharedHiddenCard && sharedRevealed) {
    score += cardValue(sharedHiddenCard)
  }

  while (score > 21 && aces > 0) {
    score -= 10
    aces -= 1
  }

  return score
}

export function dealInitial(
  players: string[],
  hostId: string,
  rng: RngFn = Math.random,
): TwistState {
  const deckAfterShuffle = createDeck(rng)
  const { hiddenCard: sharedHiddenCard, remainingDeck } = dealHiddenCard(deckAfterShuffle)
  let deck = remainingDeck

  const playersRecord: Record<string, TwistPlayer> = {}

  for (const id of players) {
    const drawP = drawCards(deck, 2)
    deck = drawP.remaining

    const hand = drawP.drawn.map((c) => ({ ...c, ownerId: id }))
    playersRecord[id] = {
      userId: id,
      hand,
      score: calculateScore(hand, sharedHiddenCard, false),
      hasStood: false,
      busted: false,
    }
  }

  return {
    status: 'player_turns',
    players: [],
    currentTurnUserId: hostId,
    roundNumber: 1,
    playersRecord,
    deck,
    sharedHiddenCard,
    pendingCard: null,
    winnerId: null,
    sharedRevealed: false,
  }
}

export function applyCardEffect(
  card: Card,
  action: 'take' | 'give',
  targetPlayer: TwistPlayer,
  kingChoice?: '+3' | '-3',
): TwistPlayer {
  let value = 10
  let effectLabel: string | undefined

  if (action === 'give') {
    if (card.rank === 'J') {
      value = -3
      effectLabel = '-3'
    } else if (card.rank === 'Q') {
      value = 3
      effectLabel = '+3'
    } else if (card.rank === 'K') {
      value = kingChoice === '-3' ? -3 : 3
      effectLabel = value > 0 ? '+3' : '-3'
    }
  } else {
    if (card.rank === 'A') {
      value = 11
    } else if (isFaceCard(card)) {
      value = 10
      effectLabel = '+10'
    } else {
      value = parseInt(card.rank, 10)
    }
  }

  const cardToInsert: Card = {
    ...card,
    isHidden: false,
    currentValue: value,
    ...(effectLabel ? { effectLabel } : {}),
  }

  return {
    ...targetPlayer,
    hand: [...targetPlayer.hand, cardToInsert],
  }
}

export function validateMove(
  state: TwistState,
  userId: string,
  actionType: 'draw' | 'face_choice' | 'stand' = 'draw',
): boolean {
  if (state.status !== 'player_turns') return false
  if (state.currentTurnUserId !== userId) return false
  const player = state.playersRecord[userId]
  if (!player || player.hasStood || player.busted) return false

  if (actionType === 'face_choice') {
    return state.pendingCard !== null && isFaceCard(state.pendingCard)
  }

  return state.pendingCard === null
}

function advanceTurnOrResolve(state: TwistState, activeUserId: string): TwistState {
  const playerIds = Object.keys(state.playersRecord)
  const players = Object.values(state.playersRecord)

  if (players.every((p) => p.hasStood || p.busted)) {
    return resolveGame(state)
  }

  const opponentId = getOpponentId(playerIds, activeUserId)
  const opponent = opponentId ? state.playersRecord[opponentId] : null
  const activePlayer = state.playersRecord[activeUserId]

  let nextTurnId = activeUserId
  if (opponent && !opponent.hasStood && !opponent.busted) {
    nextTurnId = opponent.userId
  } else if (activePlayer && (activePlayer.hasStood || activePlayer.busted)) {
    nextTurnId = getNextTurn(playerIds, activeUserId)
  }

  return {
    ...state,
    currentTurnUserId: nextTurnId,
  }
}

export function drawTurnCard(
  state: TwistState,
  userId: string,
  rng: RngFn = Math.random,
): TwistState {
  if (!validateMove(state, userId, 'draw')) return state

  const workingDeck = state.deck.length > 0 ? state.deck : createDeck(rng)
  const { drawn, remaining } = drawCards(workingDeck, 1)
  if (drawn.length === 0) return state

  const card = { ...drawn[0], isHidden: false, ownerId: userId }

  if (isFaceCard(card)) {
    return {
      ...state,
      deck: remaining,
      pendingCard: card,
    }
  }

  const player = state.playersRecord[userId]
  const withCard = applyCardEffect(card, 'take', player)
  const score = calculateScore(withCard.hand, state.sharedHiddenCard, state.sharedRevealed)
  const updatedPlayer: TwistPlayer = {
    ...withCard,
    score,
    busted: score > 21,
  }

  const nextState: TwistState = {
    ...state,
    deck: remaining,
    playersRecord: {
      ...state.playersRecord,
      [userId]: updatedPlayer,
    },
  }

  return advanceTurnOrResolve(nextState, userId)
}

export function resolvePendingCardChoice(
  state: TwistState,
  userId: string,
  action: 'take' | 'give',
  kingChoice?: '+3' | '-3',
): TwistState {
  if (!validateMove(state, userId, 'face_choice') || !state.pendingCard) {
    return state
  }

  const card = state.pendingCard
  const playerIds = Object.keys(state.playersRecord)
  const targetId =
    action === 'give' ? (getOpponentId(playerIds, userId) ?? userId) : userId

  const target = state.playersRecord[targetId]
  if (!target) return state

  const withCard = applyCardEffect(card, action, target, kingChoice)
  const score = calculateScore(withCard.hand, state.sharedHiddenCard, state.sharedRevealed)
  const updatedTarget: TwistPlayer = {
    ...withCard,
    score,
    busted: score > 21,
  }

  const nextState: TwistState = {
    ...state,
    pendingCard: null,
    playersRecord: {
      ...state.playersRecord,
      [targetId]: updatedTarget,
    },
  }

  return advanceTurnOrResolve(nextState, userId)
}

export function standTurn(state: TwistState, userId: string): TwistState {
  if (!validateMove(state, userId, 'stand')) return state

  const player = state.playersRecord[userId]
  const nextState: TwistState = {
    ...state,
    playersRecord: {
      ...state.playersRecord,
      [userId]: {
        ...player,
        hasStood: true,
      },
    },
  }

  return advanceTurnOrResolve(nextState, userId)
}

export function resolveGame(state: TwistState): TwistState {
  const pList = Object.values(state.playersRecord)
  if (pList.length < 2) return state

  const updatedPlayers: Record<string, TwistPlayer> = {}
  for (const p of pList) {
    const finalScore = calculateScore(p.hand, state.sharedHiddenCard, true)
    updatedPlayers[p.userId] = {
      ...p,
      score: finalScore,
      busted: finalScore > 21,
    }
  }

  const p1 = updatedPlayers[pList[0].userId]
  const p2 = updatedPlayers[pList[1].userId]

  let winnerId: string = 'draw'
  if (p1.busted && p2.busted) {
    winnerId = 'draw'
  } else if (p1.busted) {
    winnerId = p2.userId
  } else if (p2.busted) {
    winnerId = p1.userId
  } else if (p1.score > p2.score) {
    winnerId = p1.userId
  } else if (p2.score > p1.score) {
    winnerId = p2.userId
  }

  return {
    ...state,
    status: 'result',
    sharedRevealed: true,
    sharedHiddenCard: state.sharedHiddenCard
      ? { ...state.sharedHiddenCard, isHidden: false }
      : null,
    pendingCard: null,
    playersRecord: updatedPlayers,
    winnerId,
  }
}
