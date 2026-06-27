import type { Card, Suit } from '../../_shared/deck';
import { createStandardDeck, shuffleDeck, drawCards } from '../../_shared/deck';
import { getNextTurn } from '../../_shared/turns';
import type { BaseGameState } from '@/types/game';

export interface FourSeasonsPlayer {
  userId: string;
  hand: Card[];
}

export interface FourSeasonsState extends BaseGameState {
  playersRecord: Record<string, FourSeasonsPlayer>;
  deck: Card[];
  discardPile: Card[];
  activeSeason: Suit;
  winnerId: string | null;
}

const SEASON_ORDER: Record<Suit, Suit> = {
  'hearts': 'diamonds',
  'diamonds': 'spades',
  'spades': 'clubs',
  'clubs': 'hearts'
};

export function dealInitialHands(players: string[], hostId: string): FourSeasonsState {
  let deck = shuffleDeck(createStandardDeck());
  
  const playersRecord: Record<string, FourSeasonsPlayer> = {};
  
  for (const id of players) {
    const drawP = drawCards(deck, 4);
    deck = drawP.remaining;
    playersRecord[id] = {
      userId: id,
      hand: drawP.drawn
    };
  }

  // Draw first card for discard pile to determine starting season
  const drawDiscard = drawCards(deck, 1);
  deck = drawDiscard.remaining;
  const discardPile = drawDiscard.drawn;
  const activeSeason = discardPile[0].suit;

  return {
    status: 'player_turns',
    players: [],
    currentTurnUserId: hostId,
    roundNumber: 1,
    playersRecord,
    deck,
    discardPile,
    activeSeason,
    winnerId: null
  };
}

export function canPlayCard(card: Card, activeSeason: Suit, isLastCard: boolean): boolean {
  // Cannot end game with a face card
  if (isLastCard && ['J', 'Q', 'K'].includes(card.rank)) {
    return false;
  }

  // King can always be played
  if (card.rank === 'K') return true;

  // Must follow seasonal order OR be the same season (standard matching rules usually imply matching current or advancing)
  // The rules say: "Must follow seasonal order (suit order)".
  // So if activeSeason is Hearts (Spring), you must play Diamonds (Summer)? Or can you play Hearts?
  // "Must follow seasonal order". Usually means you can only play the NEXT season. 
  // Let's assume you can play the exact same season, OR the next season. 
  // Wait, if it "must follow", maybe ONLY the next season is allowed? "Must follow seasonal order (suit order) EXCEPT when King is played".
  // If it's literally strictly the next season: `SEASON_ORDER[activeSeason] === card.suit`. Let's use this strict interpretation.
  return card.suit === SEASON_ORDER[activeSeason] || card.suit === activeSeason;
}

export function validateMove(state: FourSeasonsState, userId: string): boolean {
  if (state.status !== 'player_turns') return false;
  if (state.currentTurnUserId !== userId) return false;
  return true;
}

export function drawCard(state: FourSeasonsState, userId: string): FourSeasonsState {
  if (state.deck.length === 0) {
    // Reshuffle discard pile if deck is empty (keeping top card)
    const topCard = state.discardPile[state.discardPile.length - 1];
    const rest = state.discardPile.slice(0, -1);
    state.deck = shuffleDeck(rest);
    state.discardPile = [topCard];
  }

  // If STILL empty, nothing to draw
  if (state.deck.length === 0) return state;

  const { remaining, drawn } = drawCards(state.deck, 1);
  
  const newState = {
    ...state,
    deck: remaining,
    playersRecord: {
      ...state.playersRecord,
      [userId]: {
        ...state.playersRecord[userId],
        hand: [...state.playersRecord[userId].hand, drawn[0]]
      }
    }
  };

  // Turn advances
  newState.currentTurnUserId = getNextTurn(Object.keys(state.playersRecord), userId);
  return newState;
}

export function playCard(state: FourSeasonsState, userId: string, cardId: string, newSeasonChoice?: Suit): FourSeasonsState {
  const player = state.playersRecord[userId];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;
  const card = player.hand[cardIndex];

  if (!canPlayCard(card, state.activeSeason, player.hand.length === 1)) {
    return state;
  }

  // Remove card from hand
  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);

  let newState = {
    ...state,
    discardPile: [...state.discardPile, card],
    playersRecord: {
      ...state.playersRecord,
      [userId]: {
        ...player,
        hand: newHand
      }
    }
  };

  // Check Win Condition
  if (newHand.length === 0) {
    newState.status = 'finished';
    newState.winnerId = userId;
    return newState;
  }

  // Apply Special Effects
  newState.activeSeason = card.suit; // Update active season to the card's suit (so next player plays the following season)

  let skipTurn = false;
  
  if (card.rank === 'J') {
    // Both players draw 1 card
    const pIds = Object.keys(newState.playersRecord);
    for (const pid of pIds) {
      if (newState.deck.length > 0) {
        const draw = drawCards(newState.deck, 1);
        newState.deck = draw.remaining;
        newState.playersRecord[pid].hand.push(draw.drawn[0]);
      }
    }
  } else if (card.rank === 'Q') {
    // Skip opponent turn
    skipTurn = true;
  } else if (card.rank === 'K') {
    // Change active season
    if (newSeasonChoice) {
      newState.activeSeason = newSeasonChoice;
    }
  }

  if (!skipTurn) {
    newState.currentTurnUserId = getNextTurn(Object.keys(state.playersRecord), userId);
  }

  return newState;
}
