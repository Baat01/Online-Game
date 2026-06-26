export function getNextTurn(playerIds: string[], currentTurnId: string | null): string {
  if (playerIds.length === 0) return '';
  if (!currentTurnId) return playerIds[0];
  
  const currentIndex = playerIds.indexOf(currentTurnId);
  if (currentIndex === -1) return playerIds[0];
  
  const nextIndex = (currentIndex + 1) % playerIds.length;
  return playerIds[nextIndex];
}
