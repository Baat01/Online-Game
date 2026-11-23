import { createStandardDeck, type Card, type Rank, type Suit } from '@/games/_shared/deck'
import { flipCoin, rollDie, shuffleArray, type RngFn } from '@/games/_shared/randomUtils'
import type { BaseGameState, GamePlayer } from '@/types/game'

export type Arcane23Phase = 'CHOOSING' | 'INTERACTION' | 'ROUND_END' | 'FINISHED'
export type DrawChoice = 'classic' | 'tarot'
export type EmperorMode = 'force_tarot' | 'forbid_tarot'

export interface EmperorEffect {
  mode: EmperorMode
  remainingTurns: number
  ownerId: string
}

export interface StarEffect {
  targetNumber: number
  remainingTurns: number
}

export type Arcane23Prompt =
  | {
      id: string
      type: 'JUDGMENT_COPY_DISCARD'
      playerId: string
      availableArcana: number[]
    }
  | {
      id: string
      type: 'GASTER_CHOOSE_WINNER'
      playerId: string
      candidates: string[]
    }
  | {
      id: string
      type: 'BATELEUR_PICK_ORDER'
      playerId: string
      topCards: Card[]
    }
  | {
      id: string
      type: 'PAPESSE_REORDER_OPPONENT'
      playerId: string
      opponentId: string
      topCards: Card[]
    }
  | {
      id: string
      type: 'ERMITE_DECIDE'
      playerId: string
      peekedCard: Card
    }
  | {
      id: string
      type: 'FORCE_SACRIFICE'
      playerId: string
      currentScore: number
    }
  | {
      id: string
      type: 'WHEEL_CALL_COIN'
      playerId: string
      ownerId: string
    }
  | {
      id: string
      type: 'STAR_PICK_NUMBER'
      playerId: string
    }
  | {
      id: string
      type: 'EMPEROR_CHOOSE_LOCK'
      playerId: string
      opponentId: string
    }

export type Arcane23PromptResponse =
  | { type: 'JUDGMENT_COPY_DISCARD'; targetArcanum: number | null }
  | { type: 'GASTER_CHOOSE_WINNER'; chosenWinnerId: string }
  | { type: 'BATELEUR_PICK_ORDER'; chosenCardId: string; remainingOrder: [string, string] | string[] }
  | { type: 'PAPESSE_REORDER_OPPONENT'; orderedCardIds: string[] }
  | { type: 'ERMITE_DECIDE'; decision: 'play' | 'cancel' }
  | { type: 'FORCE_SACRIFICE'; sacrifice: boolean }
  | { type: 'WHEEL_CALL_COIN'; call: 'heads' | 'tails' }
  | { type: 'STAR_PICK_NUMBER'; number: number }
  | { type: 'EMPEROR_CHOOSE_LOCK'; mode: EmperorMode }

export interface Arcane23PlayerState {
  userId: string
  score: number
  classicDeck: Card[]
  classicDiscard: Card[]
  tarotCooldown: boolean
  noCooldownNextTurn: boolean
  choice: DrawChoice | null
  drawnClassic: Card | null
  drawnClassicExtra: Card | null
  drawnTarot: number | null
  effectiveTarot: number | null
  judgmentBonusPower: number
  gasterRoll: [number, number, number] | null
  forceJokerSecured: boolean
  bustedDiable: boolean
  ermiteCancelled: boolean
}

export interface Arcane23RoundOutcome {
  roundNumber: number
  winnerId: string | null
  reason: string
  pointsAwarded: Record<string, number>
  cancelled: boolean
  hiddenByMoon: boolean
  usedGaster: boolean
  wheelFlip?: {
    callerId: string
    call: 'heads' | 'tails'
    result: 'heads' | 'tails'
    winnerId: string
  }
}

export interface Arcane23PersistentBoard {
  moon: boolean
  sun: boolean
  suddenDeath: boolean
  emperor: Record<string, EmperorEffect | null>
  star: Record<string, StarEffect | null>
}

export interface Arcane23State extends BaseGameState {
  phase: Arcane23Phase
  playerIds: string[]
  playersRecord: Record<string, Arcane23PlayerState>
  targetRoundsToWin: number
  winnerId: string | null
  tarotDeck: number[]
  tarotDiscard: number[]
  activePersistentArcana: Arcane23PersistentBoard
  pendingPrompts: Arcane23Prompt[]
  roundOutcome: Arcane23RoundOutcome | null
  hiddenOutcomeSnapshot: {
    roundNumber: number
    winnerId: string | null
    reason: string
    summary: string
  } | null
  lastRevealedMoonOutcome: {
    roundNumber: number
    winnerId: string | null
    reason: string
    summary: string
  } | null
  historyLog: string[]
}

export interface SubmitChoiceOptions {
  rng?: RngFn
  forceGasterRoll?: [number, number, number]
}

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

export function getClassicCardNumericValue(card: Card): number {
  return RANK_VALUES[card.rank] ?? 0
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

function createAllTarotNumbers(rng: RngFn = Math.random): number[] {
  const nums = Array.from({ length: 22 }, (_, i) => i)
  return shuffleArray(nums, rng)
}

function drawFromClassicDeck(
  player: Arcane23PlayerState,
  rng: RngFn = Math.random,
): Card | null {
  if (player.classicDeck.length === 0 && player.classicDiscard.length > 0) {
    player.classicDeck = shuffleArray(player.classicDiscard, rng)
    player.classicDiscard = []
  }
  return player.classicDeck.shift() ?? null
}

function ensureClassicDeckCount(
  player: Arcane23PlayerState,
  count: number,
  rng: RngFn = Math.random,
): void {
  if (player.classicDeck.length < count && player.classicDiscard.length > 0) {
    const reshuffled = shuffleArray(player.classicDiscard, rng)
    player.classicDeck = [...player.classicDeck, ...reshuffled]
    player.classicDiscard = []
  }
}

function drawFromTarotDeck(
  state: Arcane23State,
  rng: RngFn = Math.random,
): number | null {
  if (state.tarotDeck.length === 0 && state.tarotDiscard.length > 0) {
    state.tarotDeck = shuffleArray(state.tarotDiscard, rng)
    state.tarotDiscard = []
  }
  const next = state.tarotDeck.shift()
  return next !== undefined ? next : null
}

function getOpponentId(state: Arcane23State, playerId: string): string {
  return state.playerIds.find((id) => id !== playerId) ?? playerId
}

export function getPlayerEffectiveClassicScore(player: Arcane23PlayerState): number {
  const primary = player.drawnClassic ? getClassicCardNumericValue(player.drawnClassic) : 0
  const extra = player.drawnClassicExtra ? getClassicCardNumericValue(player.drawnClassicExtra) : 0
  return primary + extra + player.judgmentBonusPower
}

export function getTarotChoiceConstraint(
  state: Arcane23State,
  playerId: string,
): { canChooseClassic: boolean; canChooseTarot: boolean; reason: string | null } {
  const player = state.playersRecord[playerId]
  if (!player) {
    return { canChooseClassic: false, canChooseTarot: false, reason: 'Joueur introuvable' }
  }
  const emp = state.activePersistentArcana.emperor[playerId]
  if (emp && emp.remainingTurns > 0) {
    if (emp.mode === 'forbid_tarot') {
      return {
        canChooseClassic: true,
        canChooseTarot: false,
        reason: `L'Empereur interdit le Tarot (${emp.remainingTurns} tour(s))`,
      }
    }
    if (emp.mode === 'force_tarot') {
      return {
        canChooseClassic: false,
        canChooseTarot: true,
        reason: `L'Empereur impose le Tarot (${emp.remainingTurns} tour(s))`,
      }
    }
  }
  if (player.tarotCooldown) {
    return {
      canChooseClassic: true,
      canChooseTarot: false,
      reason: 'Recharge Tarot active (1 tour sur 2)',
    }
  }
  return { canChooseClassic: true, canChooseTarot: true, reason: null }
}

export function canPlayerChooseTarot(state: Arcane23State, playerId: string): boolean {
  return getTarotChoiceConstraint(state, playerId).canChooseTarot
}

export function createInitialArcane23State(
  playerIds: string[],
  hostId: string,
  rng: RngFn = Math.random,
): Arcane23State {
  const seated = playerIds.slice(0, 2)
  const players: GamePlayer[] = seated.map((id, idx) => ({
    userId: id,
    username: `Player ${idx + 1}`,
    avatarUrl: null,
    seatIndex: idx,
    isReady: true,
  }))

  const playersRecord: Record<string, Arcane23PlayerState> = {}
  for (const id of seated) {
    playersRecord[id] = {
      userId: id,
      score: 0,
      classicDeck: shuffleArray(createStandardDeck(), rng),
      classicDiscard: [],
      tarotCooldown: false,
      noCooldownNextTurn: false,
      choice: null,
      drawnClassic: null,
      drawnClassicExtra: null,
      drawnTarot: null,
      effectiveTarot: null,
      judgmentBonusPower: 0,
      gasterRoll: null,
      forceJokerSecured: false,
      bustedDiable: false,
      ermiteCancelled: false,
    }
  }

  return {
    status: 'player_turns',
    phase: 'CHOOSING',
    players,
    playerIds: seated,
    currentTurnUserId: hostId ?? seated[0] ?? null,
    roundNumber: 1,
    targetRoundsToWin: 5,
    winnerId: null,
    playersRecord,
    tarotDeck: createAllTarotNumbers(rng),
    tarotDiscard: [],
    activePersistentArcana: {
      moon: false,
      sun: false,
      suddenDeath: false,
      emperor: Object.fromEntries(seated.map((id) => [id, null])),
      star: Object.fromEntries(seated.map((id) => [id, null])),
    },
    pendingPrompts: [],
    roundOutcome: null,
    hiddenOutcomeSnapshot: null,
    lastRevealedMoonOutcome: null,
    historyLog: ['Manche 1 — Choisissez secrètement entre votre paquet de 52 cartes et le Tarot.'],
  }
}

function cloneState(state: Arcane23State): Arcane23State {
  return JSON.parse(JSON.stringify(state)) as Arcane23State
}

function ensureBaseClassicDraw(player: Arcane23PlayerState, rng: RngFn): void {
  if (!player.drawnClassic) {
    player.drawnClassic = drawFromClassicDeck(player, rng)
  }
}

function getEffectiveTarot(player: Arcane23PlayerState): number | null {
  return player.effectiveTarot
}

function playerHasTarot(state: Arcane23State, arcanumNumber: number): string[] {
  return state.playerIds.filter((pid) => getEffectiveTarot(state.playersRecord[pid]) === arcanumNumber)
}

/**
 * Computes any remaining interactive prompts or resolves the round once all prompts are answered.
 */
function advanceResolution(state: Arcane23State, rng: RngFn = Math.random): Arcane23State {
  const s = cloneState(state)
  const [p0, p1] = s.playerIds
  const rec0 = s.playersRecord[p0]
  const rec1 = s.playersRecord[p1]

  // Variable Priority XX. Le Jugement must pick an Arcana from tarotDiscard before priority resolution
  const judgmentPlayers = s.playerIds.filter((pid) => s.playersRecord[pid].effectiveTarot === 20)
  for (const jPid of judgmentPlayers) {
    const rec = s.playersRecord[jPid]
    if (s.tarotDiscard.length > 0) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = jPid
      s.pendingPrompts = [
        {
          id: `judgment-${s.roundNumber}-${jPid}`,
          type: 'JUDGMENT_COPY_DISCARD',
          playerId: jPid,
          availableArcana: [...s.tarotDiscard],
        },
      ]
      return s
    } else {
      // No discarded Arcana to copy: Le Jugement grants a decisive +4 bonus to classic draw
      rec.effectiveTarot = null
      rec.judgmentBonusPower = 4
      s.historyLog.unshift('XX. Le Jugement (défausse vide) confère +4 de puissance au tirage classique.')
    }
  }

  // Priority 0: 666. Gaster (1/666 anomaly)
  const gasterOwners = playerHasTarot(s, 666)
  if (gasterOwners.length > 0 && !s.roundOutcome) {
    s.phase = 'INTERACTION'
    s.currentTurnUserId = gasterOwners[0]
    s.pendingPrompts = [
      {
        id: `gaster-${s.roundNumber}-${gasterOwners[0]}`,
        type: 'GASTER_CHOOSE_WINNER',
        playerId: gasterOwners[0],
        candidates: [...s.playerIds],
      },
    ]
    return s
  }

  // Priority 1: XVI. La Maison Dieu (Purges all board effects & cancels opposing Tarot)
  const towerOwners = playerHasTarot(s, 16)
  if (towerOwners.length > 0) {
    s.activePersistentArcana.moon = false
    s.activePersistentArcana.sun = false
    s.activePersistentArcana.suddenDeath = false
    s.targetRoundsToWin = 5
    for (const pid of s.playerIds) {
      s.activePersistentArcana.emperor[pid] = null
      s.activePersistentArcana.star[pid] = null
      const pRec = s.playersRecord[pid]
      if (pRec.effectiveTarot !== null && pRec.effectiveTarot !== 16) {
        s.tarotDiscard.push(pRec.effectiveTarot)
        pRec.effectiveTarot = null
      }
      ensureBaseClassicDraw(pRec, rng)
    }
    s.historyLog.unshift('XVI. La Maison Dieu purge les effets persistants et impose un duel classique pur.')
    return finalizeClassicComparison(s, rng, { skipSpecialTarotModifiers: true })
  }

  // Priority 2: 0. Le Mat + XIV. Tempérance -> Sudden Death combo OR individual effects
  const matOwners = playerHasTarot(s, 0)
  const tempOwners = playerHasTarot(s, 14)

  if (matOwners.length > 0 && tempOwners.length > 0) {
    for (const pid of s.playerIds) {
      s.playersRecord[pid].score = 0
    }
    s.activePersistentArcana.suddenDeath = true
    s.targetRoundsToWin = 1
    s.historyLog.unshift('0. Le Mat + XIV. Tempérance : MORT SUBITE ! Scores remis à 0 — le prochain vainqueur gagne la partie.')
    return completeRoundOutcome(s, {
      winnerId: null,
      reason: 'Mort Subite activée (0. Le Mat + XIV. Tempérance) : scores réinitialisés à 0.',
      cancelled: true,
      pointsAwarded: { [p0]: 0, [p1]: 0 },
    })
  }

  if (matOwners.length > 0) {
    for (const mPid of matOwners) {
      s.playersRecord[mPid].noCooldownNextTurn = true
    }
    s.historyLog.unshift('0. Le Mat annule la manche et libère son porteur du délai Tarot.')
    return completeRoundOutcome(s, {
      winnerId: null,
      reason: '0. Le Mat annule la manche sans attribuer de point.',
      cancelled: true,
      pointsAwarded: { [p0]: 0, [p1]: 0 },
    })
  }

  if (tempOwners.length > 0) {
    for (const tPid of tempOwners) {
      const oppId = getOpponentId(s, tPid)
      s.playersRecord[tPid].score = s.playersRecord[oppId].score
    }
    s.historyLog.unshift('XIV. Tempérance égalise les scores de manches.')
    return completeRoundOutcome(s, {
      winnerId: null,
      reason: 'XIV. Tempérance égalise le score de manches sur celui de l’adversaire.',
      cancelled: true,
      pointsAwarded: { [p0]: 0, [p1]: 0 },
    })
  }

  // Priority 3: XIII. La Mort & XII. Le Pendu
  const deathOwners = playerHasTarot(s, 13)
  if (deathOwners.length > 0) {
    for (const pid of s.playerIds) {
      const pRec = s.playersRecord[pid]
      const pool: Card[] = [...pRec.classicDeck, ...pRec.classicDiscard]
      if (pRec.drawnClassic) pool.push(pRec.drawnClassic)
      if (pRec.drawnClassicExtra) pool.push(pRec.drawnClassicExtra)
      pRec.classicDeck = shuffleArray(pool, rng)
      pRec.classicDiscard = []
      pRec.drawnClassic = drawFromClassicDeck(pRec, rng)
      pRec.drawnClassicExtra = null
      pRec.effectiveTarot = null
    }
    const tarotPool = [...s.tarotDeck, ...s.tarotDiscard]
    s.tarotDeck = shuffleArray(tarotPool, rng)
    s.tarotDiscard = []
    s.historyLog.unshift('XIII. La Mort remélange tous les paquets (52 cartes & Tarot) et relance un duel classique.')
    return finalizeClassicComparison(s, rng, { skipSpecialTarotModifiers: true })
  }

  const penduOwners = playerHasTarot(s, 12)
  if (penduOwners.length === 1) {
    const tmpClassic = rec0.drawnClassic
    const tmpExtra = rec0.drawnClassicExtra
    rec0.drawnClassic = rec1.drawnClassic
    rec0.drawnClassicExtra = rec1.drawnClassicExtra
    rec1.drawnClassic = tmpClassic
    rec1.drawnClassicExtra = tmpExtra
    const penduOwner = penduOwners[0]
    s.playersRecord[penduOwner].effectiveTarot = null
    s.historyLog.unshift('XII. Le Pendu échange les cartes piochées entre les deux joueurs.')
  } else if (penduOwners.length === 2) {
    rec0.effectiveTarot = null
    rec1.effectiveTarot = null
  }

  // Priority 4: I. Le Bateleur (1), II. La Papesse (2), IX. L'Ermite (9)
  const bateleurOwners = playerHasTarot(s, 1).filter((pid) => !s.playersRecord[pid].drawnClassic)
  if (bateleurOwners.length > 0) {
    const bPid = bateleurOwners[0]
    const bRec = s.playersRecord[bPid]
    ensureClassicDeckCount(bRec, 3, rng)
    const topCards = bRec.classicDeck.slice(0, 3)
    if (topCards.length > 0) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = bPid
      s.pendingPrompts = [
        {
          id: `bateleur-${s.roundNumber}-${bPid}`,
          type: 'BATELEUR_PICK_ORDER',
          playerId: bPid,
          topCards,
        },
      ]
      return s
    }
  }

  const papesseOwners = playerHasTarot(s, 2)
  if (papesseOwners.length > 0) {
    const pPid = papesseOwners[0]
    const oppId = getOpponentId(s, pPid)
    const oppRec = s.playersRecord[oppId]
    ensureClassicDeckCount(oppRec, 3, rng)
    const topCards = oppRec.classicDeck.slice(0, 3)
    if (topCards.length > 0) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = pPid
      s.pendingPrompts = [
        {
          id: `papesse-${s.roundNumber}-${pPid}`,
          type: 'PAPESSE_REORDER_OPPONENT',
          playerId: pPid,
          opponentId: oppId,
          topCards,
        },
      ]
      return s
    }
  }

  const ermiteOwners = playerHasTarot(s, 9)
  if (ermiteOwners.length > 0) {
    const ePid = ermiteOwners[0]
    const eRec = s.playersRecord[ePid]
    ensureBaseClassicDraw(eRec, rng)
    if (eRec.drawnClassic) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = ePid
      s.pendingPrompts = [
        {
          id: `ermite-${s.roundNumber}-${ePid}`,
          type: 'ERMITE_DECIDE',
          playerId: ePid,
          peekedCard: eRec.drawnClassic,
        },
      ]
      return s
    }
  }

  // Priority 5: III. L'Impératrice (3) & VII. Le Chariot (7)
  for (const pid of playerHasTarot(s, 3)) {
    const rec = s.playersRecord[pid]
    if (!rec.drawnClassic) {
      const c1 = drawFromClassicDeck(rec, rng)
      const c2 = drawFromClassicDeck(rec, rng)
      if (c1 && c2) {
        const sunMode = s.activePersistentArcana.sun || playerHasTarot(s, 19).length > 0
        const v1 = getClassicCardNumericValue(c1)
        const v2 = getClassicCardNumericValue(c2)
        const keepFirst = sunMode ? v1 <= v2 : v1 >= v2
        rec.drawnClassic = keepFirst ? c1 : c2
        rec.classicDiscard.push(keepFirst ? c2 : c1)
        s.historyLog.unshift('III. L’Impératrice pioche 2 cartes et conserve la plus avantageuse.')
      } else {
        rec.drawnClassic = c1 ?? c2
      }
    }
  }

  for (const pid of playerHasTarot(s, 7)) {
    const rec = s.playersRecord[pid]
    if (!rec.drawnClassic) {
      rec.drawnClassic = drawFromClassicDeck(rec, rng)
      rec.drawnClassicExtra = drawFromClassicDeck(rec, rng)
      s.historyLog.unshift('VII. Le Chariot additionne 2 cartes classiques.')
    }
  }

  // Priority 6: XI. La Force (11) prompt (only if player hasn't resolved Force yet and has score >= 1)
  const forceOwners = playerHasTarot(s, 11).filter(
    (pid) => !s.playersRecord[pid].forceJokerSecured && !s.playersRecord[pid].drawnClassic,
  )
  if (forceOwners.length > 0) {
    const fPid = forceOwners[0]
    const fRec = s.playersRecord[fPid]
    if (fRec.score >= 1) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = fPid
      s.pendingPrompts = [
        {
          id: `force-${s.roundNumber}-${fPid}`,
          type: 'FORCE_SACRIFICE',
          playerId: fPid,
          currentScore: fRec.score,
        },
      ]
      return s
    } else {
      ensureBaseClassicDraw(fRec, rng)
    }
  }

  // Priority 7: V. Le Pape (5) & X. La Roue de la Fortune (10) — Overrides La Force!
  const papeOwners = playerHasTarot(s, 5)
  if (papeOwners.length > 0) {
    s.historyLog.unshift('V. Le Pape impose une trêve absolue : égalité pacifique (aucun point).')
    return completeRoundOutcome(s, {
      winnerId: null,
      reason: 'V. Le Pape impose une égalité pacifique absolue.',
      cancelled: true,
      pointsAwarded: { [p0]: 0, [p1]: 0 },
    })
  }

  const wheelOwners = playerHasTarot(s, 10)
  if (wheelOwners.length > 0) {
    const ownerId = wheelOwners[0]
    const oppId = getOpponentId(s, ownerId)
    s.phase = 'INTERACTION'
    s.currentTurnUserId = oppId
    s.pendingPrompts = [
      {
        id: `wheel-${s.roundNumber}-${oppId}`,
        type: 'WHEEL_CALL_COIN',
        playerId: oppId,
        ownerId,
      },
    ]
    return s
  }

  // Ensure every player has a classic card before XV. Le Diable check and Priority 8-9 comparison
  for (const pid of s.playerIds) {
    const rec = s.playersRecord[pid]
    if (!rec.forceJokerSecured) {
      ensureBaseClassicDraw(rec, rng)
    }
  }

  // Priority 6b: XV. Le Diable (15) — draw 2nd card if first doesn't beat opponent; bust if sum > 21
  for (const dPid of playerHasTarot(s, 15)) {
    const rec = s.playersRecord[dPid]
    const oppRec = s.playersRecord[getOpponentId(s, dPid)]
    if (!rec.drawnClassicExtra && rec.drawnClassic) {
      const myVal = getPlayerEffectiveClassicScore(rec)
      const oppVal = getPlayerEffectiveClassicScore(oppRec)
      if (myVal <= oppVal) {
        rec.drawnClassicExtra = drawFromClassicDeck(rec, rng)
        const total = getPlayerEffectiveClassicScore(rec)
        if (total > 21) {
          rec.bustedDiable = true
          rec.score = Math.max(0, rec.score - 2)
          s.historyLog.unshift(`XV. Le Diable dépasse 21 (${total}) ! Banqueroute : -2 manches.`)
        } else {
          s.historyLog.unshift(`XV. Le Diable pioche une 2e carte sans dépasser 21 (${total}).`)
        }
      }
    }
  }

  // Check Priority 10 persistent prompts before final completion: XVII. L'Étoile (17) & IV. L'Empereur (4)
  return finalizeClassicComparison(s, rng, { skipSpecialTarotModifiers: false })
}

function finalizeClassicComparison(
  state: Arcane23State,
  _rng: RngFn,
  opts: { skipSpecialTarotModifiers: boolean },
): Arcane23State {
  const s = cloneState(state)
  const [p0, p1] = s.playerIds
  const rec0 = s.playersRecord[p0]
  const rec1 = s.playersRecord[p1]

  // Check if XIX. Le Soleil (19) was played this round (activates Sun & clears Moon)
  if (!opts.skipSpecialTarotModifiers && playerHasTarot(s, 19).length > 0) {
    s.activePersistentArcana.sun = true
    s.activePersistentArcana.moon = false
    s.historyLog.unshift('XIX. Le Soleil illumine le plateau : désormais, la plus petite carte gagne.')
  }

  let winnerId: string | null = null
  let reason = ''
  let pts = 1

  // Joker from XI. La Force wins automatically unless opponent also has Force Joker
  if (!opts.skipSpecialTarotModifiers && (rec0.forceJokerSecured || rec1.forceJokerSecured)) {
    if (rec0.forceJokerSecured && rec1.forceJokerSecured) {
      winnerId = null
      reason = 'Double Joker (XI. La Force) : les forces s’annulent.'
      pts = 0
    } else {
      winnerId = rec0.forceJokerSecured ? p0 : p1
      // Sacrifice 1 round -> net +1 round by awarding 2 on victory
      pts = 2
      reason = 'XI. La Force sacrifie 1 manche pour forger un Joker imbattable (+2 manches).'
    }
  } else if (rec0.bustedDiable !== rec1.bustedDiable) {
    winnerId = rec0.bustedDiable ? p1 : p0
    reason = 'XV. Le Diable a dépassé 21 (Bust) : défaite automatique.'
  } else {
    // Check VI. L'Amoureux (same suit color -> +2 rounds for drawer)
    const lovers = opts.skipSpecialTarotModifiers ? [] : playerHasTarot(s, 6)
    const c0 = rec0.drawnClassic
    const c1 = rec1.drawnClassic
    if (lovers.length === 1 && c0 && c1 && isRedSuit(c0.suit) === isRedSuit(c1.suit)) {
      winnerId = lovers[0]
      pts = 2
      reason = 'VI. L’Amoureux unit deux cartes de même couleur : victoire (+2 manches) !'
    } else {
      const v0 = getPlayerEffectiveClassicScore(rec0)
      const v1 = getPlayerEffectiveClassicScore(rec1)

      if (v0 === v1) {
        winnerId = null
        pts = 0
        reason = `Égalité parfaite (${v0} vs ${v1}) : aucun point attribué.`
      } else {
        let highWins = !s.activePersistentArcana.sun
        if (
          !opts.skipSpecialTarotModifiers &&
          playerHasTarot(s, 8).length > 0 &&
          Math.abs(v0 - v1) >= 5
        ) {
          highWins = !highWins
          reason = `VIII. La Justice renverse l’écart de ${Math.abs(v0 - v1)} points !`
        }

        winnerId = highWins ? (v0 > v1 ? p0 : p1) : v0 < v1 ? p0 : p1
        if (!reason) {
          reason = s.activePersistentArcana.sun
            ? `Soleil actif (plus petite carte gagne) : ${v0} vs ${v1}.`
            : `Comparaison classique : ${v0} vs ${v1}.`
        }
      }
    }
  }

  // XXI. Le Monde (21): winning awards 2 rounds instead of 1
  if (!opts.skipSpecialTarotModifiers && winnerId && getEffectiveTarot(s.playersRecord[winnerId]) === 21) {
    pts = Math.max(pts, 2)
    reason += ' XXI. Le Monde double la victoire (+2 manches) !'
  }

  // XVII. L'Étoile existing corner effect check: winning with chosen number awards +2 rounds
  if (winnerId) {
    const activeStar = s.activePersistentArcana.star[winnerId]
    const winCard = s.playersRecord[winnerId].drawnClassic
    if (
      activeStar &&
      activeStar.remainingTurns > 0 &&
      winCard &&
      getClassicCardNumericValue(winCard) === activeStar.targetNumber
    ) {
      pts = Math.max(pts, 2)
      reason += ` XVII. L’Étoile aligne le #${activeStar.targetNumber} (+2 manches) !`
    }
  }

  // Prompt XVII. L'Étoile (17) or IV. L'Empereur (4) if played this round (post-resolution corner placement)
  if (!opts.skipSpecialTarotModifiers) {
    const pendingStar = playerHasTarot(s, 17).find(
      (pid) => s.playersRecord[pid].effectiveTarot === 17 && !s.activePersistentArcana.star[pid],
    )
    if (pendingStar) {
      // Wait — store temporary outcome & let prompt finish cleanly, or complete round outcome AFTER prompts!
    }
  }

  const resolved = completeRoundOutcome(s, {
    winnerId,
    reason,
    cancelled: false,
    pointsAwarded: {
      [p0]: winnerId === p0 ? pts : 0,
      [p1]: winnerId === p1 ? pts : 0,
    },
  })

  // Queue post-round persistent placements (L'Étoile / L'Empereur) if newly drawn this turn
  if (!opts.skipSpecialTarotModifiers) {
    for (const pid of playerHasTarot(resolved, 17)) {
      resolved.phase = 'INTERACTION'
      resolved.currentTurnUserId = pid
      resolved.pendingPrompts.push({
        id: `star-${resolved.roundNumber}-${pid}`,
        type: 'STAR_PICK_NUMBER',
        playerId: pid,
      })
    }
    for (const pid of playerHasTarot(resolved, 4)) {
      resolved.phase = 'INTERACTION'
      resolved.currentTurnUserId = pid
      resolved.pendingPrompts.push({
        id: `emperor-${resolved.roundNumber}-${pid}`,
        type: 'EMPEROR_CHOOSE_LOCK',
        playerId: pid,
        opponentId: getOpponentId(resolved, pid),
      })
    }
    if (resolved.pendingPrompts.length > 0) {
      resolved.currentTurnUserId = resolved.pendingPrompts[0].playerId
      // Pause match win transition until interactive post-effect settles unless score already >= target
      if (resolved.winnerId) {
        resolved.status = 'player_turns'
      }
      return resolved
    }
  }

  return resolved
}

function completeRoundOutcome(
  state: Arcane23State,
  opts: {
    winnerId: string | null
    reason: string
    cancelled: boolean
    pointsAwarded: Record<string, number>
    usedGaster?: boolean
    wheelFlip?: Arcane23RoundOutcome['wheelFlip']
  },
): Arcane23State {
  const s = cloneState(state)
  const [p0, p1] = s.playerIds

  if (opts.winnerId && opts.pointsAwarded[opts.winnerId]) {
    s.playersRecord[opts.winnerId].score += opts.pointsAwarded[opts.winnerId]
  }

  // Decrement active Star remainingTurns for existing stars
  for (const pid of s.playerIds) {
    const star = s.activePersistentArcana.star[pid]
    if (star) {
      const nextTurns = star.remainingTurns - 1
      s.activePersistentArcana.star[pid] = nextTurns > 0 ? { ...star, remainingTurns: nextTurns } : null
    }
  }

  const moonPlayed = playerHasTarot(s, 18).length > 0
  if (moonPlayed) {
    s.activePersistentArcana.moon = true
  }

  const c0 = s.playersRecord[p0].drawnClassic
  const c1 = s.playersRecord[p1].drawnClassic
  const cardsSummary = `J1: ${c0 ? `${c0.rank}${c0.suit[0].toUpperCase()}` : 'Arcane'} · J2: ${c1 ? `${c1.rank}${c1.suit[0].toUpperCase()}` : 'Arcane'}`

  if (s.activePersistentArcana.moon) {
    s.hiddenOutcomeSnapshot = {
      roundNumber: s.roundNumber,
      winnerId: opts.winnerId,
      reason: opts.reason,
      summary: cardsSummary,
    }
  }

  s.roundOutcome = {
    roundNumber: s.roundNumber,
    winnerId: opts.winnerId,
    reason: opts.reason,
    pointsAwarded: opts.pointsAwarded,
    cancelled: opts.cancelled,
    hiddenByMoon: s.activePersistentArcana.moon,
    usedGaster: Boolean(opts.usedGaster),
    wheelFlip: opts.wheelFlip,
  }

  const matchWinner = s.playerIds.find((pid) => s.playersRecord[pid].score >= s.targetRoundsToWin) ?? null
  if (matchWinner) {
    s.winnerId = matchWinner
    s.status = 'finished'
    s.phase = 'FINISHED'
    s.currentTurnUserId = null
    // Reveal Moon snapshot immediately if match just ended!
    if (s.hiddenOutcomeSnapshot) {
      s.lastRevealedMoonOutcome = s.hiddenOutcomeSnapshot
      s.hiddenOutcomeSnapshot = null
      s.activePersistentArcana.moon = false
      if (s.roundOutcome) s.roundOutcome.hiddenByMoon = false
    }
    s.historyLog.unshift(`Victoire finale ! Score requis (${s.targetRoundsToWin}) atteint.`)
  } else {
    s.status = 'player_turns'
    s.phase = 'ROUND_END'
    s.currentTurnUserId = s.playerIds[0] ?? null
  }

  // Silence unused rng lint cleanly if completeRoundOutcome doesn't need rng
  return s
}

export function submitDrawChoice(
  state: Arcane23State,
  playerId: string,
  choice: DrawChoice,
  options?: SubmitChoiceOptions,
): Arcane23State {
  if (state.phase !== 'CHOOSING') return state
  const rec = state.playersRecord[playerId]
  if (!rec || rec.choice !== null) return state

  const constraint = getTarotChoiceConstraint(state, playerId)
  if (choice === 'tarot' && !constraint.canChooseTarot) return state
  if (choice === 'classic' && !constraint.canChooseClassic) return state

  const s = cloneState(state)
  const rng = options?.rng ?? Math.random
  s.playersRecord[playerId].choice = choice

  // Both players must commit before reveal
  const bothChosen = s.playerIds.every((pid) => s.playersRecord[pid].choice !== null)
  if (!bothChosen) {
    return s
  }

  // Reveal any previous round veiled by XVIII. La Lune now that both players locked in choices
  if (s.hiddenOutcomeSnapshot) {
    s.lastRevealedMoonOutcome = s.hiddenOutcomeSnapshot
    s.hiddenOutcomeSnapshot = null
    s.activePersistentArcana.moon = false
  } else {
    s.lastRevealedMoonOutcome = null
  }

  // Decrement active Emperor locks once the forced/forbidden choice has been locked in
  for (const pid of s.playerIds) {
    const emp = s.activePersistentArcana.emperor[pid]
    if (emp) {
      const nextTurns = emp.remainingTurns - 1
      s.activePersistentArcana.emperor[pid] =
        nextTurns > 0 ? { ...emp, remainingTurns: nextTurns } : null
    }
  }

  // Draw chosen cards for both players
  for (let i = 0; i < s.playerIds.length; i++) {
    const pid = s.playerIds[i]
    const pRec = s.playersRecord[pid]
    if (pRec.choice === 'classic') {
      pRec.drawnClassic = drawFromClassicDeck(pRec, rng)
      pRec.drawnTarot = null
      pRec.effectiveTarot = null
      pRec.gasterRoll = null
    } else {
      // Check 1/666 anomaly (3d10 rolling 6-6-6) before every Tarot draw
      const d10Roll: [number, number, number] =
        options?.forceGasterRoll && i === 0
          ? options.forceGasterRoll
          : [rollDie(10, rng) - 1, rollDie(10, rng) - 1, rollDie(10, rng) - 1]
      pRec.gasterRoll = d10Roll

      if (d10Roll[0] === 6 && d10Roll[1] === 6 && d10Roll[2] === 6) {
        pRec.drawnTarot = 666
        pRec.effectiveTarot = 666
        s.historyLog.unshift('ANOMALIE 666 ! 3d10 = 6-6-6 — W. D. Gaster surgit hors du paquet !')
      } else {
        const arcNum = drawFromTarotDeck(s, rng)
        pRec.drawnTarot = arcNum
        pRec.effectiveTarot = arcNum
      }
    }
  }

  return advanceResolution(s, rng)
}

export function resolveArcanePrompt(
  state: Arcane23State,
  playerId: string,
  response: Arcane23PromptResponse,
  rng: RngFn = Math.random,
): Arcane23State {
  if (state.phase !== 'INTERACTION' || state.pendingPrompts.length === 0) return state
  const currentPrompt = state.pendingPrompts[0]
  if (currentPrompt.playerId !== playerId || currentPrompt.type !== response.type) return state

  const s = cloneState(state)
  s.pendingPrompts.shift()
  const rec = s.playersRecord[playerId]

  switch (response.type) {
    case 'JUDGMENT_COPY_DISCARD': {
      if (response.targetArcanum !== null && s.tarotDiscard.includes(response.targetArcanum)) {
        rec.effectiveTarot = response.targetArcanum
        s.historyLog.unshift(`XX. Le Jugement adopte l’effet de l’Arcane #${response.targetArcanum}.`)
      } else {
        rec.effectiveTarot = null
        rec.judgmentBonusPower = 4
      }
      return advanceResolution(s, rng)
    }

    case 'GASTER_CHOOSE_WINNER': {
      const [p0, p1] = s.playerIds
      const chosen = s.playerIds.includes(response.chosenWinnerId) ? response.chosenWinnerId : playerId
      s.historyLog.unshift(`666. Gaster tranche l’anomalie : victoire immédiate pour ce joueur !`)
      return completeRoundOutcome(s, {
        winnerId: chosen,
        reason: '666. Gaster (1/666) décrète unilatéralement le vainqueur de la manche.',
        cancelled: false,
        usedGaster: true,
        pointsAwarded: {
          [p0]: chosen === p0 ? 1 : 0,
          [p1]: chosen === p1 ? 1 : 0,
        },
      })
    }

    case 'BATELEUR_PICK_ORDER': {
      const top3 = rec.classicDeck.splice(0, 3)
      const chosen = top3.find((c) => c.id === response.chosenCardId) ?? top3[0] ?? null
      const rest = top3.filter((c) => c.id !== chosen?.id)
      const orderedRest: Card[] = []
      for (const cid of response.remainingOrder) {
        const found = rest.find((c) => c.id === cid)
        if (found) orderedRest.push(found)
      }
      for (const c of rest) {
        if (!orderedRest.some((o) => o.id === c.id)) orderedRest.push(c)
      }
      rec.drawnClassic = chosen
      rec.classicDeck = [...orderedRest, ...rec.classicDeck]
      s.historyLog.unshift('I. Le Bateleur choisit parmi les 3 premières cartes de son paquet.')
      return advanceResolution(s, rng)
    }

    case 'PAPESSE_REORDER_OPPONENT': {
      const oppId = getOpponentId(s, playerId)
      const oppRec = s.playersRecord[oppId]
      const top3 = oppRec.classicDeck.splice(0, 3)
      const reordered: Card[] = []
      for (const cid of response.orderedCardIds) {
        const found = top3.find((c) => c.id === cid)
        if (found) reordered.push(found)
      }
      for (const c of top3) {
        if (!reordered.some((o) => o.id === c.id)) reordered.push(c)
      }
      oppRec.classicDeck = [...reordered, ...oppRec.classicDeck]
      rec.effectiveTarot = null
      ensureBaseClassicDraw(rec, rng)
      s.historyLog.unshift('II. La Papesse réorganise le sommet du paquet adverse.')
      return advanceResolution(s, rng)
    }

    case 'ERMITE_DECIDE': {
      const [p0, p1] = s.playerIds
      if (response.decision === 'cancel') {
        rec.ermiteCancelled = true
        s.historyLog.unshift('IX. L’Ermite consulte sa carte secrète et annule la manche.')
        return completeRoundOutcome(s, {
          winnerId: null,
          reason: 'IX. L’Ermite a choisi d’annuler la manche après consultation.',
          cancelled: true,
          pointsAwarded: { [p0]: 0, [p1]: 0 },
        })
      }
      rec.effectiveTarot = null
      s.historyLog.unshift('IX. L’Ermite accepte le duel avec sa carte.')
      return advanceResolution(s, rng)
    }

    case 'FORCE_SACRIFICE': {
      if (response.sacrifice && rec.score >= 1) {
        rec.score -= 1
        rec.forceJokerSecured = true
        s.historyLog.unshift('XI. La Force sacrifie 1 manche gagnée pour invoquer un Joker imbattable.')
      } else {
        rec.effectiveTarot = null
        ensureBaseClassicDraw(rec, rng)
        s.historyLog.unshift('XI. La Force conserve ses manches et pioche normalement.')
      }
      return advanceResolution(s, rng)
    }

    case 'WHEEL_CALL_COIN': {
      const [p0, p1] = s.playerIds
      const result = flipCoin(rng)
      const ownerId =
        currentPrompt.type === 'WHEEL_CALL_COIN' ? currentPrompt.ownerId : getOpponentId(s, playerId)
      const roundWinner = result === response.call ? playerId : ownerId
      s.historyLog.unshift(
        `X. La Roue de la Fortune : ${response.call === 'heads' ? 'Face' : 'Pile'} → ${result === 'heads' ? 'Face' : 'Pile'} (+2 manches) !`,
      )
      return completeRoundOutcome(s, {
        winnerId: roundWinner,
        reason: `X. La Roue de la Fortune (${result === 'heads' ? 'Face' : 'Pile'}) attribue +2 manches !`,
        cancelled: false,
        pointsAwarded: {
          [p0]: roundWinner === p0 ? 2 : 0,
          [p1]: roundWinner === p1 ? 2 : 0,
        },
        wheelFlip: {
          callerId: playerId,
          call: response.call,
          result,
          winnerId: roundWinner,
        },
      })
    }

    case 'STAR_PICK_NUMBER': {
      const target = Math.max(2, Math.min(10, Math.round(response.number)))
      s.activePersistentArcana.star[playerId] = {
        targetNumber: target,
        remainingTurns: 2,
      }
      s.historyLog.unshift(`XVII. L’Étoile bénit le chiffre ${target} pour les 2 prochains tours.`)
      break
    }

    case 'EMPEROR_CHOOSE_LOCK': {
      const oppId = getOpponentId(s, playerId)
      s.activePersistentArcana.emperor[oppId] = {
        mode: response.mode,
        remainingTurns: 2,
        ownerId: playerId,
      }
      s.historyLog.unshift(
        `IV. L’Empereur décrète : ${response.mode === 'force_tarot' ? 'Tarot obligatoire' : 'Tarot interdit'} pour 2 tours.`,
      )
      break
    }
  }

  if (s.pendingPrompts.length > 0) {
    s.phase = 'INTERACTION'
    s.currentTurnUserId = s.pendingPrompts[0].playerId
    return s
  }

  const finalWinner = s.playerIds.find((pid) => s.playersRecord[pid].score >= s.targetRoundsToWin) ?? null
  if (finalWinner) {
    s.winnerId = finalWinner
    s.status = 'finished'
    s.phase = 'FINISHED'
    s.currentTurnUserId = null
  } else {
    s.phase = 'ROUND_END'
    s.currentTurnUserId = s.playerIds[0] ?? null
  }
  return s
}

export function advanceToNextRound(state: Arcane23State, rng: RngFn = Math.random): Arcane23State {
  if (state.phase !== 'ROUND_END' || state.status === 'finished') return state
  const s = cloneState(state)

  for (const pid of s.playerIds) {
    const rec = s.playersRecord[pid]
    if (rec.drawnClassic) {
      rec.classicDiscard.push(rec.drawnClassic)
      rec.drawnClassic = null
    }
    if (rec.drawnClassicExtra) {
      rec.classicDiscard.push(rec.drawnClassicExtra)
      rec.drawnClassicExtra = null
    }
    if (rec.drawnTarot !== null && rec.drawnTarot !== 666) {
      // Keep out persistent board arcana while active on the board
      const isActiveStar = rec.drawnTarot === 17 && Boolean(s.activePersistentArcana.star[pid])
      const isActiveEmp =
        rec.drawnTarot === 4 &&
        Object.values(s.activePersistentArcana.emperor).some((e) => e?.ownerId === pid)
      const isActiveSun = rec.drawnTarot === 19 && s.activePersistentArcana.sun
      const isActiveMoon = rec.drawnTarot === 18 && s.activePersistentArcana.moon
      if (!isActiveStar && !isActiveEmp && !isActiveSun && !isActiveMoon) {
        s.tarotDiscard.push(rec.drawnTarot)
      }
    }

    // Cooldown applies if player drew Tarot this round unless 0. Le Mat waived it
    rec.tarotCooldown = rec.choice === 'tarot' && !rec.noCooldownNextTurn
    rec.noCooldownNextTurn = false
    rec.choice = null
    rec.drawnTarot = null
    rec.effectiveTarot = null
    rec.judgmentBonusPower = 0
    rec.gasterRoll = null
    rec.forceJokerSecured = false
    rec.bustedDiable = false
    rec.ermiteCancelled = false
  }

  // Ensure decks never stay empty when entering next round
  if (s.tarotDeck.length === 0 && s.tarotDiscard.length > 0) {
    s.tarotDeck = shuffleArray(s.tarotDiscard, rng)
    s.tarotDiscard = []
  }

  s.roundNumber += 1
  s.phase = 'CHOOSING'
  s.roundOutcome = null
  s.pendingPrompts = []
  s.currentTurnUserId = s.playerIds[0] ?? null
  s.historyLog.unshift(`Manche ${s.roundNumber} — Faites votre choix en secret.`)
  return s
}

/**
 * Helper to pick an automatic response for solo/AI testing or Oracle opponent.
 */
export function buildDefaultPromptResponse(prompt: Arcane23Prompt): Arcane23PromptResponse {
  switch (prompt.type) {
    case 'JUDGMENT_COPY_DISCARD':
      return {
        type: 'JUDGMENT_COPY_DISCARD',
        targetArcanum: prompt.availableArcana[prompt.availableArcana.length - 1] ?? null,
      }
    case 'GASTER_CHOOSE_WINNER':
      return { type: 'GASTER_CHOOSE_WINNER', chosenWinnerId: prompt.playerId }
    case 'BATELEUR_PICK_ORDER': {
      const sorted = [...prompt.topCards].sort(
        (a, b) => getClassicCardNumericValue(b) - getClassicCardNumericValue(a),
      )
      const chosen = sorted[0]?.id ?? ''
      const rest = sorted.slice(1).map((c) => c.id)
      return { type: 'BATELEUR_PICK_ORDER', chosenCardId: chosen, remainingOrder: rest }
    }
    case 'PAPESSE_REORDER_OPPONENT': {
      const weakestFirst = [...prompt.topCards]
        .sort((a, b) => getClassicCardNumericValue(a) - getClassicCardNumericValue(b))
        .map((c) => c.id)
      return { type: 'PAPESSE_REORDER_OPPONENT', orderedCardIds: weakestFirst }
    }
    case 'ERMITE_DECIDE': {
      const val = getClassicCardNumericValue(prompt.peekedCard)
      return { type: 'ERMITE_DECIDE', decision: val >= 8 ? 'play' : 'cancel' }
    }
    case 'FORCE_SACRIFICE':
      return { type: 'FORCE_SACRIFICE', sacrifice: prompt.currentScore >= 2 }
    case 'WHEEL_CALL_COIN':
      return { type: 'WHEEL_CALL_COIN', call: 'heads' }
    case 'STAR_PICK_NUMBER':
      return { type: 'STAR_PICK_NUMBER', number: 10 }
    case 'EMPEROR_CHOOSE_LOCK':
      return { type: 'EMPEROR_CHOOSE_LOCK', mode: 'forbid_tarot' }
  }
}
