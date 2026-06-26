export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function flipCoin(): 'heads' | 'tails' {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}
