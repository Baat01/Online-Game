import { rollDice, flipCoin } from '../../_shared/random';
import type { BaseGameState } from '@/types/game';

export interface SavingThrowPlayer {
  userId: string;
  score: number;
  wins: number;
  role: 'first' | 'second' | null;
  hasRolled: boolean;
  hasRerolled: boolean;
  finalScore: number | null;
}

export interface SavingThrowState extends BaseGameState {
  playersRecord: Record<string, SavingThrowPlayer>;
  challengerId: string | null;
  coinChoice: 'heads' | 'tails' | null;
  coinResult: 'heads' | 'tails' | null;
  roundWinnerId: string | null;
  gameWinnerId: string | null;
  tiebreakerActive: boolean;
}

export function rollTwoD10(): [number, number] {
  // 1-10 mapped to 0-9 for tens, 1-10 for units (or standard 1-10 for both and combine)
  // Standard d100: tens die is 00-90, units die is 0-9.
  // Actually, "roll 2d10: tens die, units die".
  // Let's make it 0-9 for tens, 0-9 for units. 0 and 0 = 100.
  const tens = rollDice(10) - 1;
  const units = rollDice(10) - 1;
  return [tens, units];
}

export function combineDice(tens: number, units: number): number {
  if (tens === 0 && units === 0) return 100;
  return (tens * 10) + units;
}

export function resolveRound(state: SavingThrowState): SavingThrowState {
  const pList = Object.values(state.playersRecord);
  const first = pList.find(p => p.role === 'first');
  const second = pList.find(p => p.role === 'second');

  if (!first || !second) return state;

  // Round resolves when second player has rolled and finished
  if (first.finalScore !== null && second.finalScore !== null) {
    let roundWinnerId = null;
    
    // "Second player must beat or go under depending on rule: must roll LOWER than first player's final score"
    if (second.finalScore < first.finalScore) {
      roundWinnerId = second.userId;
      second.wins += 1;
    } else {
      roundWinnerId = first.userId;
      first.wins += 1;
    }

    return {
      ...state,
      roundWinnerId,
      status: 'result',
    };
  }

  return state;
}

export function checkWinner(state: SavingThrowState): SavingThrowState {
  const pList = Object.values(state.playersRecord);
  for (const p of pList) {
    if (p.wins >= 3) {
      return {
        ...state,
        gameWinnerId: p.userId,
        status: 'finished',
      };
    }
  }
  // Tie Break rule: if match tied (e.g. somehow? Best of 5 means someone gets 3. Wait, "If overall match tied: coin flip decided by challenger". Best of 5 cannot tie unless someone drops out or there's a tiebreaker game mode. Maybe if they both get to 2-2 and the 5th round is a tie? But the rules say "must roll LOWER", so ties are impossible because second player either is < or >= .
  // We'll leave tiebreaker hook just in case.)
  return state;
}

export function nextRole(state: SavingThrowState): SavingThrowState {
  const pList = Object.values(state.playersRecord);
  const first = pList.find(p => p.role === 'first');
  const second = pList.find(p => p.role === 'second');

  if (!first || !second) return state;

  return {
    ...state,
    status: 'player_turns',
    currentTurnUserId: second.userId, // After nextRole, first becomes second
    playersRecord: {
      ...state.playersRecord,
      [first.userId]: { ...first, role: 'second', hasRolled: false, hasRerolled: false, finalScore: null, score: 0 },
      [second.userId]: { ...second, role: 'first', hasRolled: false, hasRerolled: false, finalScore: null, score: 0 },
    },
    roundNumber: state.roundNumber + 1,
    roundWinnerId: null,
  };
}

export function handleTiebreak(state: SavingThrowState, challengerChoice: 'heads' | 'tails'): SavingThrowState {
  const result = flipCoin();
  const challenger = state.playersRecord[state.challengerId!];
  const other = Object.values(state.playersRecord).find(p => p.userId !== state.challengerId)!;

  const winnerId = (challengerChoice === result) ? challenger.userId : other.userId;
  
  return {
    ...state,
    coinResult: result,
    gameWinnerId: winnerId,
    status: 'finished',
    tiebreakerActive: false
  };
}

export function createInitialState(players: string[], hostId: string): SavingThrowState {
  const playersRecord: Record<string, SavingThrowPlayer> = {};
  players.forEach(id => {
    playersRecord[id] = {
      userId: id,
      score: 0,
      wins: 0,
      role: null,
      hasRolled: false,
      hasRerolled: false,
      finalScore: null,
    };
  });

  return {
    status: 'waiting',
    players: [],
    currentTurnUserId: null,
    roundNumber: 1,
    playersRecord,
    challengerId: players.find(p => p !== hostId) || players[1] || null,
    coinChoice: null,
    coinResult: null,
    roundWinnerId: null,
    gameWinnerId: null,
    tiebreakerActive: false,
  };
}
