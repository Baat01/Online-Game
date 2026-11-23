/**
 * Shared turn-based helpers and round management utilities.
 */

export function getNextTurn(
  playerIds: string[],
  currentTurnId: string | null,
  skipCount = 0,
): string {
  if (playerIds.length === 0) return ''
  if (!currentTurnId) return playerIds[0]

  const currentIndex = playerIds.indexOf(currentTurnId)
  if (currentIndex === -1) return playerIds[0]

  const steps = 1 + Math.max(0, skipCount)
  const nextIndex = (currentIndex + steps) % playerIds.length
  return playerIds[nextIndex]
}

export function getOpponentId(playerIds: string[], userId: string): string | null {
  return playerIds.find((id) => id !== userId) ?? null
}

export function isPlayerTurn(
  currentTurnUserId: string | null,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId && currentTurnUserId && currentTurnUserId === userId)
}

export function advanceRound(
  roundNumber: number,
  maxRounds?: number,
): { roundNumber: number; isMaxReached: boolean } {
  const next = roundNumber + 1
  return {
    roundNumber: next,
    isMaxReached: typeof maxRounds === 'number' ? next > maxRounds : false,
  }
}

export function swapPlayerRoles<T extends { role: 'first' | 'second' | null }>(
  record: Record<string, T>,
): {
  record: Record<string, T>
  newFirstUserId: string | null
  newSecondUserId: string | null
} {
  const updated: Record<string, T> = {}
  let newFirstUserId: string | null = null
  let newSecondUserId: string | null = null

  for (const [id, player] of Object.entries(record)) {
    const swappedRole: 'first' | 'second' | null =
      player.role === 'first' ? 'second' : player.role === 'second' ? 'first' : null

    if (swappedRole === 'first') newFirstUserId = id
    if (swappedRole === 'second') newSecondUserId = id

    updated[id] = {
      ...player,
      role: swappedRole,
    }
  }

  return { record: updated, newFirstUserId, newSecondUserId }
}
