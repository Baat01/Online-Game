import { createStandardDeck, shuffleDeck, drawCards } from '../../_shared/deck';
import type { Card } from '../../_shared/deck';
import type { BaseGameState } from '@/types/game';

export interface TwistPlayer {
  userId: string;
  hand: Card[];
  score: number;
  hasStood: boolean;
  busted: boolean;
}

export interface TwistState extends BaseGameState {
  playersRecord: Record<string, TwistPlayer>;
  deck: Card[];
  sharedHiddenCard: Card | null;
  winnerId: string | null;
  sharedRevealed: boolean;
}

export function createDeck(): Card[] {
  return shuffleDeck(createStandardDeck());
}

export function calculateScore(hand: Card[], sharedHiddenCard: Card | null, sharedRevealed: boolean): number {
  let score = 0;
  let aces = 0;

  const calculateCardValue = (card: Card, isShared: boolean) => {
    if (isShared && !sharedRevealed) return 0; // Doesn't contribute until revealed
    
    // Normal values for numbers
    if (!['J', 'Q', 'K', 'A'].includes(card.rank)) {
      return parseInt(card.rank, 10);
    }

    if (card.rank === 'A') {
      aces += 1;
      return 11; // Base A value
    }

    // Face cards without special logic default to 10
    // (Wait, the rules say: "Player can either take (for normal value +10) or give to opponent their figure (for special value...)")
    // Let's assume standard face cards are 10 when "taken" normally.
    // If they were given, they would have been converted in applyCardEffect?
    // Let's keep it simple: if they are in the hand, and they are face cards, if they have a special negative value, they need a way to store it.
    // We can add a custom `currentValue` field to the card when in hand.
    return (card as any).currentValue !== undefined ? (card as any).currentValue : 10;
  };

  for (const card of hand) {
    score += calculateCardValue(card, false);
  }

  if (sharedHiddenCard && sharedRevealed) {
    score += calculateCardValue(sharedHiddenCard, true);
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

export function dealInitial(players: string[], hostId: string): TwistState {
  let deck = createDeck();
  
  // Deal 1 hidden shared card
  const draw1 = drawCards(deck, 1);
  const sharedHiddenCard = { ...draw1.drawn[0], isHidden: true };
  deck = draw1.remaining;

  const playersRecord: Record<string, TwistPlayer> = {};
  
  // Deal 2 cards to each player
  for (const id of players) {
    const drawP = drawCards(deck, 2);
    deck = drawP.remaining;
    
    playersRecord[id] = {
      userId: id,
      hand: drawP.drawn,
      score: 0, // Calculated later when applying effects is not strictly needed for initial setup but let's init
      hasStood: false,
      busted: false,
    };
    playersRecord[id].score = calculateScore(playersRecord[id].hand, sharedHiddenCard, false);
  }

  return {
    status: 'player_turns',
    players: [],
    currentTurnUserId: hostId, // Host starts
    roundNumber: 1,
    playersRecord,
    deck,
    sharedHiddenCard,
    winnerId: null,
    sharedRevealed: false
  };
}

export function applyCardEffect(card: Card, action: 'take' | 'give', targetPlayer: TwistPlayer, kingChoice?: '+3' | '-3'): TwistPlayer {
  let value = 10;
  
  if (action === 'give') {
    if (card.rank === 'J') value = -3;
    else if (card.rank === 'Q') value = 3;
    else if (card.rank === 'K') {
      value = kingChoice === '-3' ? -3 : 3;
    }
  } else {
    // If taken normally, number cards are their number, face cards are 10, A is 11.
    if (!['J', 'Q', 'K', 'A'].includes(card.rank)) {
      value = parseInt(card.rank, 10);
    } else if (card.rank === 'A') {
      value = 11;
    } else {
      value = 10;
    }
  }

  const newHand = [...targetPlayer.hand, { ...card, currentValue: value } as any];
  return {
    ...targetPlayer,
    hand: newHand
  };
}

export function validateMove(state: TwistState, userId: string): boolean {
  if (state.status !== 'player_turns') return false;
  if (state.currentTurnUserId !== userId) return false;
  const player = state.playersRecord[userId];
  if (!player || player.hasStood || player.busted) return false;
  return true;
}

export function resolveGame(state: TwistState): TwistState {
  const pList = Object.values(state.playersRecord);
  
  // Recalculate scores with revealed card
  pList.forEach(p => {
    p.score = calculateScore(p.hand, state.sharedHiddenCard, true);
    if (p.score > 21) p.busted = true;
  });

  const p1 = pList[0];
  const p2 = pList[1];

  let winnerId = null;

  if (p1.busted && p2.busted) {
    winnerId = 'draw'; // Both busted
  } else if (p1.busted) {
    winnerId = p2.userId;
  } else if (p2.busted) {
    winnerId = p1.userId;
  } else {
    // Neither busted, closest to 21
    if (p1.score > p2.score) winnerId = p1.userId;
    else if (p2.score > p1.score) winnerId = p2.userId;
    else winnerId = 'draw';
  }

  return {
    ...state,
    status: 'result',
    sharedRevealed: true,
    playersRecord: { [p1.userId]: p1, [p2.userId]: p2 },
    winnerId
  };
}
