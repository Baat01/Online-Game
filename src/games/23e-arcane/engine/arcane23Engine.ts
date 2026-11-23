import { createStandardDeck, type Card, type Rank } from '@/games/_shared/deck'
import { flipCoin, rollDie, shuffleArray, type RngFn } from '@/games/_shared/randomUtils'
import type { BaseGameState, GamePlayer } from '@/types/game'

export type Arcane23Phase = 'CHOOSING' | 'INTERACTION' | 'ROUND_END' | 'FINISHED'
export type PresentationStep =
  | 'EMPEROR_CHOICE'
  | 'CHOOSING'
  | 'CLASSIC_REVEAL'
  | 'TAROT_1'
  | 'TAROT_2'
  | 'RESOLVED'
export type DrawChoice = 'classic' | 'tarot'
export type EmperorMode = 'force_tarot' | 'forbid_tarot'

export interface ArcanaRuleSpec {
  number: number
  roman: string
  title: string
  priorityRank: number
  priorityLabel: string
  shortEffect: string
  detailedEffect: string
  requiresInteractivePrompt: boolean
}

export const ARCANA_RULES_CATALOG: Record<number, ArcanaRuleSpec> = {
  666: {
    number: 666,
    roman: '666',
    title: 'W. D. Gaster — L’Anomalie du Vide',
    priorityRank: 0,
    priorityLabel: 'Priorité 0 (Suprême)',
    shortEffect: '1/666 (3d10 = 6-6-6). Désigne immédiatement le vainqueur de la partie.',
    detailedEffect:
      'Anomalie dimensionnelle hors paquet (1/666 avant chaque tirage de Tarot). Déclenche un glitch et permet au tireur de désigner immédiatement le gagnant de toute la partie.',
    requiresInteractivePrompt: true,
  },
  13: {
    number: 13,
    roman: 'XIII',
    title: 'L’Arcane sans nom (Death)',
    priorityRank: 1,
    priorityLabel: 'Priorité 1',
    shortEffect: 'Le tireur perd instantanément la partie.',
    detailedEffect:
      'Fatalité absolue : le joueur qui pioche XIII. L’Arcane sans nom perd instantanément la partie, quel que soit le score.',
    requiresInteractivePrompt: false,
  },
  15: {
    number: 15,
    roman: 'XV',
    title: 'Le Diable (Devil)',
    priorityRank: 2,
    priorityLabel: 'Priorité 2',
    shortEffect: 'Annule la manche (0 pt), active la Mort Subite et reset les cooldowns Tarot.',
    detailedEffect:
      'Annule la manche en cours (0 point), déclenche la Mort Subite (le prochain vainqueur d’un duel gagne toute la partie) et réinitialise immédiatement le cooldown Tarot des deux joueurs pour le tour suivant.',
    requiresInteractivePrompt: false,
  },
  21: {
    number: 21,
    roman: 'XXI',
    title: 'Le Monde (World)',
    priorityRank: 3,
    priorityLabel: 'Priorité 3',
    shortEffect: 'Victoire immédiate de la manche + remélange des défausses.',
    detailedEffect:
      'Accorde immédiatement la victoire de la manche (2 manches si III. L’Impératrice est active) et remélange la défausse classique du tireur dans son deck ainsi que la défausse de Tarot dans la pile de Tarot.',
    requiresInteractivePrompt: false,
  },
  0: {
    number: 0,
    roman: '0',
    title: 'Le Mat (The Fool)',
    priorityRank: 4,
    priorityLabel: 'Priorité 4',
    shortEffect: 'Inverse la hiérarchie (2 bat As). Ignoré face à La Roue ou Le Pape.',
    detailedEffect:
      'Inverse la hiérarchie des cartes classiques pour cette manche : la carte la plus faible (2) bat la plus forte (As). Sans effet si X. La Roue de la Fortune ou V. Le Pape est joué au même tour.',
    requiresInteractivePrompt: false,
  },
  5: {
    number: 5,
    roman: 'V',
    title: 'Le Pape (Hierophant)',
    priorityRank: 5,
    priorityLabel: 'Priorité 5',
    shortEffect: 'Annule le duel ; les 2 joueurs gagnent chacun 1 manche.',
    detailedEffect:
      'Annule le duel classique (et rend Le Mat / Tempérance sans effet) : les deux joueurs gagnent chacun 1 manche immédiatement.',
    requiresInteractivePrompt: false,
  },
  10: {
    number: 10,
    roman: 'X',
    title: 'La Roue de la Fortune',
    priorityRank: 5,
    priorityLabel: 'Priorité 5',
    shortEffect: 'L’adversaire appelle Pile/Face sur la pièce 3D : le gagnant prend 2 manches.',
    detailedEffect:
      'Annule le duel classique (prime sur Le Mat et Tempérance). L’adversaire choisit Pile ou Face, le tireur lance la pièce 3D et le gagnant du lancer remporte 2 manches.',
    requiresInteractivePrompt: true,
  },
  14: {
    number: 14,
    roman: 'XIV',
    title: 'Tempérance (Temperance)',
    priorityRank: 5,
    priorityLabel: 'Priorité 5',
    shortEffect: 'Moyenne des 2 cartes : entière = tireur gagne ; non entière = adversaire.',
    detailedEffect:
      'Calcule la moyenne des deux cartes classiques (J=11, Q=12, K=13, A=14). Si la moyenne est entière (somme paire), le tireur gagne ; sinon l’adversaire gagne. Effet inversé lorsqu’elle est combinée avec 0. Le Mat.',
    requiresInteractivePrompt: false,
  },
  3: {
    number: 3,
    roman: 'III',
    title: 'L’Impératrice (Empress)',
    priorityRank: 6,
    priorityLabel: 'Priorité 6',
    shortEffect: 'Le vainqueur de la manche remporte 2 manches au lieu d’une.',
    detailedEffect:
      'Double l’enjeu de la manche : le vainqueur de cette manche remporte 2 manches gagnées au lieu d’une.',
    requiresInteractivePrompt: false,
  },
  8: {
    number: 8,
    roman: 'VIII',
    title: 'La Justice (Justice)',
    priorityRank: 7,
    priorityLabel: 'Priorité 7',
    shortEffect: 'Le joueur en tête redescend au score de manches de son adversaire.',
    detailedEffect:
      'Avant la résolution du duel, le joueur en tête redescend immédiatement au même nombre de manches gagnées que son adversaire.',
    requiresInteractivePrompt: false,
  },
  16: {
    number: 16,
    roman: 'XVI',
    title: 'La Maison Dieu (Tower)',
    priorityRank: 7,
    priorityLabel: 'Priorité 7',
    shortEffect: 'Les 2 joueurs perdent immédiatement 2 manches gagnées (min 0).',
    detailedEffect:
      'Choc soudain appliqué avant le duel : les deux joueurs perdent immédiatement 2 manches gagnées (minimum 0).',
    requiresInteractivePrompt: false,
  },
  1: {
    number: 1,
    roman: 'I',
    title: 'Le Bateleur (Magician)',
    priorityRank: 8,
    priorityLabel: 'Priorité 8',
    shortEffect: 'Regarde les 3 premières cartes, en joue 1 et réordonne les 2 autres.',
    detailedEffect:
      'Consulte les 3 premières cartes de son deck classique, choisit laquelle jouer pour ce tour et replace les 2 autres sur le dessus du deck dans l’ordre désiré.',
    requiresInteractivePrompt: true,
  },
  6: {
    number: 6,
    roman: 'VI',
    title: 'L’Amoureux (Lovers)',
    priorityRank: 8,
    priorityLabel: 'Priorité 8',
    shortEffect: 'Tire 2 cartes : 2 chiffres = somme (max 10) ; sinon garde la plus forte.',
    detailedEffect:
      'Pioche 2 cartes classiques : si ce sont deux cartes chiffrées (2–10), additionne leurs valeurs (plafonné à 10) ; si au moins une figure (J, Q, K, A) sort, conserve uniquement la plus forte.',
    requiresInteractivePrompt: false,
  },
  7: {
    number: 7,
    roman: 'VII',
    title: 'Le Chariot (Chariot)',
    priorityRank: 8,
    priorityLabel: 'Priorité 8',
    shortEffect: 'Sa carte gagne +1 en puissance par manche déjà remportée.',
    detailedEffect:
      'Pioche 1 carte classique qui gagne +1 de puissance bonus pour chaque manche déjà remportée par le tireur.',
    requiresInteractivePrompt: false,
  },
  9: {
    number: 9,
    roman: 'IX',
    title: 'L’Ermite (Hermit)',
    priorityRank: 8,
    priorityLabel: 'Priorité 8',
    shortEffect: 'Observe la carte adverse (hors Lune/Tarot), puis choisit de jouer ou d’annuler.',
    detailedEffect:
      'Observe la carte classique jouée par l’adversaire (masquée si XVIII. La Lune est active ou si l’adversaire a aussi pris le Tarot), puis décide toujours soit de disputer la manche en piochant sa carte classique, soit d’annuler le tour (manche nulle).',
    requiresInteractivePrompt: true,
  },
  11: {
    number: 11,
    roman: 'XI',
    title: 'La Force (Strength)',
    priorityRank: 8,
    priorityLabel: 'Priorité 8',
    shortEffect: 'Peut sacrifier 1 manche gagnée après pioche pour forger un Joker imbattable.',
    detailedEffect:
      'Après avoir pioché sa carte classique, peut sacrifier 1 manche gagnée (si score ≥ 1) pour transformer sa carte en Joker imbattable pour ce duel.',
    requiresInteractivePrompt: true,
  },
  12: {
    number: 12,
    roman: 'XII',
    title: 'Le Pendu (Hanged Man)',
    priorityRank: 9,
    priorityLabel: 'Priorité 9',
    shortEffect: 'Échange obligatoirement sa carte classique avec celle de l’adversaire.',
    detailedEffect:
      'Une fois les deux cartes classiques révélées, échange obligatoirement la carte classique du tireur avec celle de l’adversaire.',
    requiresInteractivePrompt: false,
  },
  2: {
    number: 2,
    roman: 'II',
    title: 'La Papesse (High Priestess)',
    priorityRank: 10,
    priorityLabel: 'Priorité 10',
    shortEffect: 'Regarde et réordonne les 3 premières cartes du deck adverse.',
    detailedEffect:
      'Consulte les 3 premières cartes du deck classique adverse et les replace sur le dessus dans l’ordre choisi. Reste visible au coin du plateau tant que ces cartes sont sur le dessus.',
    requiresInteractivePrompt: true,
  },
  4: {
    number: 4,
    roman: 'IV',
    title: 'L’Empereur (Emperor)',
    priorityRank: 10,
    priorityLabel: 'Priorité 10',
    shortEffect: 'Au début des 2 prochains tours, choisit d’interdire ou de forcer le Tarot adverse.',
    detailedEffect:
      'Pose un décret actif pour les 2 prochains tours (hors tour actuel). Au début de chacun de ces 2 tours, le détenteur de L’Empereur choisit librement pour ce tour précis d’interdire le Tarot ou de forcer l’adversaire à piocher dans le Tarot (outrepasse le cooldown).',
    requiresInteractivePrompt: false,
  },
  17: {
    number: 17,
    roman: 'XVII',
    title: 'L’Étoile (Star)',
    priorityRank: 10,
    priorityLabel: 'Priorité 10',
    shortEffect: 'Nomme un chiffre (2–10) : s’il sort aux 2 prochains tours, +2 manches.',
    detailedEffect:
      'Nomme un chiffre entre 2 et 10. Dès que cette valeur est jouée par l’un ou l’autre joueur au cours des 2 prochains tours (hors tour actuel), le tireur gagne immédiatement +2 manches et l’effet s’éteint.',
    requiresInteractivePrompt: true,
  },
  18: {
    number: 18,
    roman: 'XVIII',
    title: 'La Lune (Moon)',
    priorityRank: 10,
    priorityLabel: 'Priorité 10',
    shortEffect: 'Toutes les cartes classiques restent face cachée jusqu’à la résolution.',
    detailedEffect:
      'Pour le reste de la partie, toutes les cartes classiques sont jouées face cachée jusqu’à la résolution complète du tour (masque aussi la carte adverse à IX. L’Ermite).',
    requiresInteractivePrompt: false,
  },
  19: {
    number: 19,
    roman: 'XIX',
    title: 'Le Soleil (Sun)',
    priorityRank: 10,
    priorityLabel: 'Priorité 10',
    shortEffect: 'Révèle les 3 prochaines cartes sur le dessus des deux decks classiques.',
    detailedEffect:
      'Révèle uniquement les 3 prochaines cartes présentes sur le dessus de chacun des deux decks classiques au moment de son activation. À chaque pioche, le nombre de cartes visibles diminue (3 → 2 → 1 → 0) jusqu’à disparaître.',
    requiresInteractivePrompt: false,
  },
  20: {
    number: 20,
    roman: 'XX',
    title: 'Le Jugement (Judgement)',
    priorityRank: 11,
    priorityLabel: 'Priorité Variable',
    shortEffect: 'Prévisualise et réactive un Arcane de la défausse Tarot avec sa priorité d’origine.',
    detailedEffect:
      'Réactive immédiatement l’effet de n’importe quelle carte présente dans la défausse de Tarot (hors Jugement et Gaster) en adoptant son rang de priorité, sans sauter d’étape. Si la défausse est vide, sans effet (pioche 1 carte classique).',
    requiresInteractivePrompt: true,
  },
}

export function getArcanaRuleSpec(number: number): ArcanaRuleSpec {
  return ARCANA_RULES_CATALOG[number] ?? ARCANA_RULES_CATALOG[0]
}

export interface EmperorEffect {
  ownerId: string
  targetId: string
  remainingTurns: number
  currentTurnMode: EmperorMode | null
  activatedRound: number
}

export interface StarEffect {
  targetNumber: number
  remainingTurns: number
  activatedRound: number
}

export interface PapesseCornerEffect {
  ownerId: string
  targetId: string
  remainingDraws: number
}

export interface SunCornerEffect {
  ownerId: string
  revealedCardsRemaining: Record<string, number>
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
      observedOpponentCard: Card | null
      hiddenByMoon: boolean
      opponentChoseTarot: boolean
    }
  | {
      id: string
      type: 'FORCE_SACRIFICE'
      playerId: string
      currentScore: number
      drawnCard: Card
    }
  | {
      id: string
      type: 'WHEEL_CALL_COIN'
      playerId: string
      ownerId: string
    }
  | {
      id: string
      type: 'WHEEL_FLIP_COIN'
      playerId: string
      callerId: string
      call: 'heads' | 'tails'
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
      remainingTurns: number
    }

export type Arcane23PromptResponse =
  | { type: 'JUDGMENT_COPY_DISCARD'; targetArcanum: number | null }
  | { type: 'GASTER_CHOOSE_WINNER'; chosenWinnerId: string }
  | { type: 'BATELEUR_PICK_ORDER'; chosenCardId: string; remainingOrder: string[] }
  | { type: 'PAPESSE_REORDER_OPPONENT'; orderedCardIds: string[] }
  | { type: 'ERMITE_DECIDE'; decision: 'play' | 'cancel' }
  | { type: 'FORCE_SACRIFICE'; sacrifice: boolean }
  | { type: 'WHEEL_CALL_COIN'; call: 'heads' | 'tails' }
  | { type: 'WHEEL_FLIP_COIN' }
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
  loversCappedSum: number | null
  chariotBonus: number
  drawnTarot: number | null
  effectiveTarot: number | null
  tarotRevealed: boolean
  tarotStepResolved: boolean
  gasterRoll: [number, number, number] | null
  forceJokerSecured: boolean
  ermiteCancelled: boolean
}

export interface Arcane23RoundOutcome {
  roundNumber: number
  winnerId: string | null
  reason: string
  pointsAwarded: Record<string, number>
  cancelled: boolean
  usedGaster: boolean
  starTriggered?: { ownerId: string; matchedNumber: number }
  wheelFlip?: {
    ownerId: string
    callerId: string
    call: 'heads' | 'tails'
    result: 'heads' | 'tails'
    winnerId: string
    coinFlipNonce: string
  }
}

export interface Arcane23PersistentBoard {
  moon: boolean
  moonOwnerId: string | null
  sun: SunCornerEffect | null
  suddenDeath: boolean
  papesse: PapesseCornerEffect | null
  emperor: Record<string, EmperorEffect | null>
  star: Record<string, StarEffect | null>
}

export interface Arcane23State extends BaseGameState {
  phase: Arcane23Phase
  presentationStep: PresentationStep
  tarotDrawOrder: string[]
  playerIds: string[]
  playersRecord: Record<string, Arcane23PlayerState>
  targetRoundsToWin: number
  winnerId: string | null
  tarotDeck: number[]
  tarotDiscard: number[]
  activePersistentArcana: Arcane23PersistentBoard
  pendingPrompts: Arcane23Prompt[]
  pendingWheelFlip: Arcane23RoundOutcome['wheelFlip'] | null
  roundOutcome: Arcane23RoundOutcome | null
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

export function getPlayerEffectiveClassicScore(player: Arcane23PlayerState): number {
  if (player.loversCappedSum !== null) {
    return player.loversCappedSum + player.chariotBonus
  }
  const base = player.drawnClassic ? getClassicCardNumericValue(player.drawnClassic) : 0
  return base + player.chariotBonus
}

function createAllTarotNumbers(rng: RngFn = Math.random): number[] {
  return shuffleArray(
    Array.from({ length: 22 }, (_, i) => i),
    rng,
  )
}

function consumeSunRevealSlot(state: Arcane23State, playerId: string, count = 1): void {
  const sun = state.activePersistentArcana.sun
  if (!sun) return
  const cur = sun.revealedCardsRemaining[playerId] ?? 0
  if (cur > 0) {
    sun.revealedCardsRemaining[playerId] = Math.max(0, cur - count)
  }
  const anyRemaining = Object.values(sun.revealedCardsRemaining).some((n) => n > 0)
  if (!anyRemaining) {
    state.activePersistentArcana.sun = null
  }
}

function drawFromClassicDeck(
  state: Arcane23State,
  playerId: string,
  rng: RngFn = Math.random,
): Card | null {
  const player = state.playersRecord[playerId]
  if (player.classicDeck.length === 0 && player.classicDiscard.length > 0) {
    player.classicDeck = shuffleArray(player.classicDiscard, rng)
    player.classicDiscard = []
  }
  const card = player.classicDeck.shift() ?? null
  if (card) {
    if (state.activePersistentArcana.papesse?.targetId === playerId) {
      const nextRem = state.activePersistentArcana.papesse.remainingDraws - 1
      state.activePersistentArcana.papesse =
        nextRem > 0 ? { ...state.activePersistentArcana.papesse, remainingDraws: nextRem } : null
    }
    consumeSunRevealSlot(state, playerId, 1)
  }
  return card
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

function drawFromTarotDeck(state: Arcane23State, rng: RngFn = Math.random): number | null {
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

export function getTarotChoiceConstraint(
  state: Arcane23State,
  playerId: string,
): { canChooseClassic: boolean; canChooseTarot: boolean; reason: string | null } {
  const player = state.playersRecord[playerId]
  if (!player) {
    return { canChooseClassic: false, canChooseTarot: false, reason: 'Joueur introuvable' }
  }
  const emp = state.activePersistentArcana.emperor[playerId]
  if (emp && emp.currentTurnMode !== null) {
    if (emp.currentTurnMode === 'forbid_tarot') {
      return {
        canChooseClassic: true,
        canChooseTarot: false,
        reason: 'L’Empereur interdit le Tarot pour ce tour',
      }
    }
    if (emp.currentTurnMode === 'force_tarot') {
      return {
        canChooseClassic: false,
        canChooseTarot: true,
        reason: 'L’Empereur impose le Tarot pour ce tour',
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
      loversCappedSum: null,
      chariotBonus: 0,
      drawnTarot: null,
      effectiveTarot: null,
      tarotRevealed: false,
      tarotStepResolved: false,
      gasterRoll: null,
      forceJokerSecured: false,
      ermiteCancelled: false,
    }
  }

  return {
    status: 'player_turns',
    phase: 'CHOOSING',
    presentationStep: 'CHOOSING',
    tarotDrawOrder: [],
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
      moonOwnerId: null,
      sun: null,
      suddenDeath: false,
      papesse: null,
      emperor: Object.fromEntries(seated.map((id) => [id, null])),
      star: Object.fromEntries(seated.map((id) => [id, null])),
    },
    pendingPrompts: [],
    pendingWheelFlip: null,
    roundOutcome: null,
    historyLog: ['Manche 1 — Choisissez secrètement entre votre paquet de 52 cartes et le Tarot.'],
  }
}

function cloneState(state: Arcane23State): Arcane23State {
  return JSON.parse(JSON.stringify(state)) as Arcane23State
}

function ensureBaseClassicDraw(state: Arcane23State, playerId: string, rng: RngFn): void {
  const rec = state.playersRecord[playerId]
  if (!rec.drawnClassic) {
    rec.drawnClassic = drawFromClassicDeck(state, playerId, rng)
  }
}

function playerHasEffectiveTarot(state: Arcane23State, arcanumNumber: number): string[] {
  return state.playerIds.filter((pid) => state.playersRecord[pid].effectiveTarot === arcanumNumber)
}

function orderTarotDrawers(state: Arcane23State, tarotIds: string[], rng: RngFn): string[] {
  if (tarotIds.length <= 1) return tarotIds
  const [a, b] = rng() < 0.5 ? [tarotIds[0], tarotIds[1]] : [tarotIds[1], tarotIds[0]]
  const ta = state.playersRecord[a].drawnTarot ?? 0
  const tb = state.playersRecord[b].drawnTarot ?? 0
  const prioA = getArcanaRuleSpec(ta).priorityRank
  const prioB = getArcanaRuleSpec(tb).priorityRank

  if (prioA <= 3 && prioB <= 3 && prioA !== prioB) return prioA < prioB ? [a, b] : [b, a]
  if (prioA <= 3 && prioB > 3) return [a, b]
  if (prioB <= 3 && prioA > 3) return [b, a]

  if (prioA === 8 && (tb === 0 || tb === 14)) return [a, b]
  if (prioB === 8 && (ta === 0 || ta === 14)) return [b, a]
  return [a, b]
}

function enterTarotSpotlight(
  state: Arcane23State,
  stepIndex: number,
  rng: RngFn,
): Arcane23State {
  const s = cloneState(state)
  const actorId = s.tarotDrawOrder[stepIndex]
  s.presentationStep = stepIndex === 0 ? 'TAROT_1' : 'TAROT_2'

  if (!actorId) {
    return resolveTurnStrictPriorities(s, rng)
  }

  const rec = s.playersRecord[actorId]
  rec.tarotRevealed = true

  // XX. Le Jugement (20): preview & confirm from discard without advancing turn prematurely
  if (rec.effectiveTarot === 20 && !rec.tarotStepResolved) {
    const eligibleDiscard = s.tarotDiscard.filter((n) => n !== 20 && n !== 666)
    if (eligibleDiscard.length > 0) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = actorId
      s.pendingPrompts = [
        {
          id: `judgment-${s.roundNumber}-${actorId}`,
          type: 'JUDGMENT_COPY_DISCARD',
          playerId: actorId,
          availableArcana: eligibleDiscard,
        },
      ]
      return s
    }
    // Empty discard -> no effect (final classic draw happens at duel resolution step)
    rec.effectiveTarot = null
    rec.tarotStepResolved = true
    s.phase = 'INTERACTION'
    s.pendingPrompts = []
    s.historyLog.unshift('XX. Le Jugement (défausse vide) est sans effet : 1 carte classique sera piochée.')
    return s
  }

  return prepareSingleTarotStepPrompts(s, actorId, rng)
}

function prepareSingleTarotStepPrompts(
  state: Arcane23State,
  actorId: string,
  rng: RngFn,
): Arcane23State {
  const s = cloneState(state)
  const rec = s.playersRecord[actorId]
  const arcNum = rec.effectiveTarot

  if (arcNum === null || rec.tarotStepResolved) {
    s.phase = 'INTERACTION'
    s.pendingPrompts = []
    return s
  }

  // Priority 0: 666. Gaster
  if (arcNum === 666) {
    s.phase = 'INTERACTION'
    s.currentTurnUserId = actorId
    s.pendingPrompts = [
      {
        id: `gaster-${s.roundNumber}-${actorId}`,
        type: 'GASTER_CHOOSE_WINNER',
        playerId: actorId,
        candidates: [...s.playerIds],
      },
    ]
    return s
  }

  // Priority 1: XIII. Death (instant match loss for drawer)
  if (arcNum === 13) {
    const oppId = getOpponentId(s, actorId)
    rec.tarotStepResolved = true
    s.winnerId = oppId
    s.status = 'finished'
    s.phase = 'FINISHED'
    s.presentationStep = 'RESOLVED'
    s.currentTurnUserId = null
    s.roundOutcome = {
      roundNumber: s.roundNumber,
      winnerId: oppId,
      reason: 'XIII. L’Arcane sans nom (Death) : défaite immédiate du tireur !',
      pointsAwarded: { [s.playerIds[0]]: 0, [s.playerIds[1]]: 0 },
      cancelled: false,
      usedGaster: false,
    }
    s.historyLog.unshift('XIII. L’Arcane sans nom : le tireur perd instantanément la partie.')
    return s
  }

  // Priority 2: XV. Le Diable (cancel round, activate Sudden Death, reset BOTH Tarot cooldowns)
  if (arcNum === 15) {
    rec.tarotStepResolved = true
    s.activePersistentArcana.suddenDeath = true
    for (const pid of s.playerIds) {
      s.playersRecord[pid].tarotCooldown = false
      s.playersRecord[pid].noCooldownNextTurn = true
    }
    s.phase = 'INTERACTION'
    s.pendingPrompts = []
    s.historyLog.unshift(
      'XV. Le Diable annule la manche, active la Mort Subite et réinitialise le cooldown Tarot des deux joueurs.',
    )
    return s
  }

  // Priority 8: I. Le Bateleur (looks at top 3 of own deck)
  if (arcNum === 1) {
    ensureClassicDeckCount(rec, 3, rng)
    const topCards = rec.classicDeck.slice(0, 3)
    if (topCards.length > 0) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = actorId
      s.pendingPrompts = [
        {
          id: `bateleur-${s.roundNumber}-${actorId}`,
          type: 'BATELEUR_PICK_ORDER',
          playerId: actorId,
          topCards,
        },
      ]
      return s
    }
  }

  // Priority 8: IX. L'Ermite — ALWAYS offers play/cancel choice, even if opponent chose Tarot!
  // Never leaks a Tarot opponent's future classic card.
  if (arcNum === 9) {
    const oppId = getOpponentId(s, actorId)
    const oppRec = s.playersRecord[oppId]
    const opponentChoseTarot = oppRec?.choice === 'tarot'
    const oppCard =
      opponentChoseTarot || s.activePersistentArcana.moon
        ? null
        : (oppRec?.drawnClassic ?? null)

    s.phase = 'INTERACTION'
    s.currentTurnUserId = actorId
    s.pendingPrompts = [
      {
        id: `ermite-${s.roundNumber}-${actorId}`,
        type: 'ERMITE_DECIDE',
        playerId: actorId,
        observedOpponentCard: oppCard,
        hiddenByMoon: s.activePersistentArcana.moon,
        opponentChoseTarot,
      },
    ]
    return s
  }

  // Priority 8: XI. La Force (draws own classic card, then may sacrifice 1 round for Joker)
  if (arcNum === 11) {
    ensureBaseClassicDraw(s, actorId, rng)
    const drawnCard = rec.drawnClassic
    if (drawnCard && rec.score >= 1) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = actorId
      s.pendingPrompts = [
        {
          id: `force-${s.roundNumber}-${actorId}`,
          type: 'FORCE_SACRIFICE',
          playerId: actorId,
          currentScore: rec.score,
          drawnCard,
        },
      ]
      return s
    }
    rec.tarotStepResolved = true
    s.phase = 'INTERACTION'
    s.pendingPrompts = []
    return s
  }

  // Priority 5: X. La Roue de la Fortune
  if (arcNum === 10) {
    const hasHighOverride = s.playerIds.some((pid) => {
      const t = s.playersRecord[pid].effectiveTarot
      return t === 666 || t === 13 || t === 15 || t === 21
    })
    if (!hasHighOverride) {
      const oppId = getOpponentId(s, actorId)
      s.phase = 'INTERACTION'
      s.currentTurnUserId = oppId
      s.pendingPrompts = [
        {
          id: `wheel-${s.roundNumber}-${actorId}`,
          type: 'WHEEL_CALL_COIN',
          playerId: oppId,
          ownerId: actorId,
        },
      ]
      return s
    }
  }

  // Priority 10: II. La Papesse (reorder opponent's top 3)
  if (arcNum === 2) {
    const oppId = getOpponentId(s, actorId)
    const oppRec = s.playersRecord[oppId]
    ensureClassicDeckCount(oppRec, 3, rng)
    const topCards = oppRec.classicDeck.slice(0, 3)
    if (topCards.length > 0) {
      s.phase = 'INTERACTION'
      s.currentTurnUserId = actorId
      s.pendingPrompts = [
        {
          id: `papesse-${s.roundNumber}-${actorId}`,
          type: 'PAPESSE_REORDER_OPPONENT',
          playerId: actorId,
          opponentId: oppId,
          topCards,
        },
      ]
      return s
    }
  }

  // Priority 10: XVII. L'Étoile (pick number 2..10 for next 2 turns)
  if (arcNum === 17) {
    s.phase = 'INTERACTION'
    s.currentTurnUserId = actorId
    s.pendingPrompts = [
      {
        id: `star-${s.roundNumber}-${actorId}`,
        type: 'STAR_PICK_NUMBER',
        playerId: actorId,
      },
    ]
    return s
  }

  // Priority 10: IV. L'Empereur does NOT prompt immediately on draw!
  // It activates a 2-turn decree whose interactive choice triggers at the start of each of the next 2 turns.
  if (arcNum === 4) {
    const oppId = getOpponentId(s, actorId)
    s.activePersistentArcana.emperor[oppId] = {
      ownerId: actorId,
      targetId: oppId,
      remainingTurns: 2,
      currentTurnMode: null,
      activatedRound: s.roundNumber,
    }
    rec.tarotStepResolved = true
    s.phase = 'INTERACTION'
    s.pendingPrompts = []
    s.historyLog.unshift(
      'IV. L’Empereur s’installe : au début des 2 prochains tours, son détenteur pourra interdire ou forcer le Tarot adverse.',
    )
    return s
  }

  // Defer final classic card draws for all other Tarot cards until duel resolution
  // so no future card is ever disclosed during TAROT_1 / TAROT_2.
  rec.tarotStepResolved = true
  s.phase = 'INTERACTION'
  s.pendingPrompts = []
  return s
}

function resolveTurnStrictPriorities(state: Arcane23State, rng: RngFn): Arcane23State {
  const s = cloneState(state)
  const [p0, p1] = s.playerIds
  const rec0 = s.playersRecord[p0]
  const rec1 = s.playersRecord[p1]

  rec0.tarotRevealed = rec0.drawnTarot !== null
  rec1.tarotRevealed = rec1.drawnTarot !== null

  // Priority 2: XV. Le Diable (round cancelled, Sudden Death enabled, cooldown reset for both)
  const diableOwners = playerHasEffectiveTarot(s, 15)
  if (diableOwners.length > 0) {
    s.activePersistentArcana.suddenDeath = true
    for (const pid of s.playerIds) {
      s.playersRecord[pid].tarotCooldown = false
      s.playersRecord[pid].noCooldownNextTurn = true
    }
    return finalizeRoundOutcome(s, {
      winnerId: null,
      reason: 'XV. Le Diable annule la manche, active la Mort Subite et réinitialise le cooldown Tarot des deux joueurs.',
      pointsAwarded: { [p0]: 0, [p1]: 0 },
      cancelled: true,
    })
  }

  // Priority 6 modifier (III. L'Impératrice -> +2 rounds instead of +1)
  const empressActive = playerHasEffectiveTarot(s, 3).length > 0
  const baseWinPoints = empressActive ? 2 : 1

  // Priority 3: XXI. Le Monde (immediate round win + discard reshuffles)
  const worldOwners = playerHasEffectiveTarot(s, 21)
  if (worldOwners.length === 1) {
    const wPid = worldOwners[0]
    const wRec = s.playersRecord[wPid]
    if (wRec.classicDiscard.length > 0) {
      wRec.classicDeck = shuffleArray([...wRec.classicDeck, ...wRec.classicDiscard], rng)
      wRec.classicDiscard = []
    }
    if (s.tarotDiscard.length > 0) {
      s.tarotDeck = shuffleArray([...s.tarotDeck, ...s.tarotDiscard], rng)
      s.tarotDiscard = []
    }
    return finalizeRoundOutcome(s, {
      winnerId: wPid,
      reason: `XXI. Le Monde accorde la victoire immédiate de la manche (+${baseWinPoints}) et remélange les défausses !`,
      pointsAwarded: {
        [p0]: wPid === p0 ? baseWinPoints : 0,
        [p1]: wPid === p1 ? baseWinPoints : 0,
      },
      cancelled: false,
    })
  }

  // Priority 8 Hermit cancel check
  const hermitCanceller = s.playerIds.find((pid) => s.playersRecord[pid].ermiteCancelled)
  if (hermitCanceller) {
    return finalizeRoundOutcome(s, {
      winnerId: null,
      reason: 'IX. L’Ermite annule la manche (0 point attribué).',
      pointsAwarded: { [p0]: 0, [p1]: 0 },
      cancelled: true,
    })
  }

  // Priority 7: VIII. La Justice & XVI. La Maison Dieu apply directly to scores before duel resolution
  if (playerHasEffectiveTarot(s, 8).length > 0) {
    const minScore = Math.min(rec0.score, rec1.score)
    rec0.score = minScore
    rec1.score = minScore
    s.historyLog.unshift(`VIII. La Justice ramène les deux joueurs à égalité (${minScore} manche(s)).`)
  }
  if (playerHasEffectiveTarot(s, 16).length > 0) {
    rec0.score = Math.max(0, rec0.score - 2)
    rec1.score = Math.max(0, rec1.score - 2)
    s.historyLog.unshift('XVI. La Maison Dieu retire 2 manches gagnées aux deux joueurs.')
  }

  // Priority 5: V. Le Pape & X. La Roue de la Fortune override classic duel
  if (playerHasEffectiveTarot(s, 5).length > 0) {
    return finalizeRoundOutcome(s, {
      winnerId: null,
      reason: 'V. Le Pape bénit la table : pas de duel, les deux joueurs gagnent +1 manche chacun.',
      pointsAwarded: { [p0]: 1, [p1]: 1 },
      cancelled: false,
    })
  }

  if (s.pendingWheelFlip) {
    const wf = s.pendingWheelFlip
    s.pendingWheelFlip = null
    return finalizeRoundOutcome(s, {
      winnerId: wf.winnerId,
      reason: `X. La Roue de la Fortune (${wf.result === 'heads' ? 'Face' : 'Pile'}) : +2 manches !`,
      pointsAwarded: {
        [p0]: wf.winnerId === p0 ? 2 : 0,
        [p1]: wf.winnerId === p1 ? 2 : 0,
      },
      cancelled: false,
      wheelFlip: wf,
    })
  }

  // Now draw final classic cards for Tarot players (VI. Amoureux, VII. Chariot, and standard Tarot classic draws)
  for (const pid of s.playerIds) {
    const pRec = s.playersRecord[pid]
    if (pRec.effectiveTarot === 6 && !pRec.drawnClassic) {
      const c1 = drawFromClassicDeck(s, pid, rng)
      const c2 = drawFromClassicDeck(s, pid, rng)
      if (c1 && c2) {
        const v1 = getClassicCardNumericValue(c1)
        const v2 = getClassicCardNumericValue(c2)
        if (v1 <= 10 && v2 <= 10) {
          pRec.drawnClassic = c1
          pRec.drawnClassicExtra = c2
          pRec.loversCappedSum = Math.min(10, v1 + v2)
        } else {
          const keepFirst = v1 >= v2
          pRec.drawnClassic = keepFirst ? c1 : c2
          pRec.classicDiscard.push(keepFirst ? c2 : c1)
          pRec.loversCappedSum = null
        }
      } else {
        pRec.drawnClassic = c1 ?? c2
      }
    } else if (pRec.effectiveTarot === 7) {
      ensureBaseClassicDraw(s, pid, rng)
      pRec.chariotBonus = pRec.score
    } else {
      ensureBaseClassicDraw(s, pid, rng)
    }
  }

  // Priority 10 persistent board activations:
  // XVIII. La Lune (permanent for rest of match)
  for (const mPid of playerHasEffectiveTarot(s, 18)) {
    s.activePersistentArcana.moon = true
    s.activePersistentArcana.moonOwnerId = mPid
    s.historyLog.unshift('XVIII. La Lune voile désormais toutes les cartes classiques jusqu’à la résolution.')
  }
  // XIX. Le Soleil — reveals ONLY the next 3 cards currently on top of each classic deck (3 -> 2 -> 1 -> 0)
  for (const sunPid of playerHasEffectiveTarot(s, 19)) {
    const remaining: Record<string, number> = {}
    for (const pid of s.playerIds) {
      ensureClassicDeckCount(s.playersRecord[pid], 3, rng)
      remaining[pid] = Math.min(3, s.playersRecord[pid].classicDeck.length)
    }
    s.activePersistentArcana.sun = {
      ownerId: sunPid,
      revealedCardsRemaining: remaining,
    }
    s.historyLog.unshift('XIX. Le Soleil révèle les 3 prochaines cartes sur le dessus de chaque deck.')
  }

  // Priority 9: XII. Le Pendu mandatorily swaps revealed classic cards
  if (playerHasEffectiveTarot(s, 12).length === 1) {
    const tmpClassic = rec0.drawnClassic
    const tmpExtra = rec0.drawnClassicExtra
    const tmpLovers = rec0.loversCappedSum
    const tmpChariot = rec0.chariotBonus
    const tmpForce = rec0.forceJokerSecured

    rec0.drawnClassic = rec1.drawnClassic
    rec0.drawnClassicExtra = rec1.drawnClassicExtra
    rec0.loversCappedSum = rec1.loversCappedSum
    rec0.chariotBonus = rec1.chariotBonus
    rec0.forceJokerSecured = rec1.forceJokerSecured

    rec1.drawnClassic = tmpClassic
    rec1.drawnClassicExtra = tmpExtra
    rec1.loversCappedSum = tmpLovers
    rec1.chariotBonus = tmpChariot
    rec1.forceJokerSecured = tmpForce
    s.historyLog.unshift('XII. Le Pendu échange obligatoirement les deux cartes classiques.')
  }

  // XVII. L'Étoile number watch check (triggers +2 rounds if matched in next 2 turns)
  let starBonusWinner: { ownerId: string; matchedNumber: number } | undefined
  for (const ownerId of s.playerIds) {
    const st = s.activePersistentArcana.star[ownerId]
    if (st && s.roundNumber > st.activatedRound && st.remainingTurns > 0) {
      const candidates = [
        rec0.drawnClassic,
        rec0.drawnClassicExtra,
        rec1.drawnClassic,
        rec1.drawnClassicExtra,
      ].filter((c): c is Card => Boolean(c))
      const hit = candidates.find((c) => {
        const val = getClassicCardNumericValue(c)
        return val >= 2 && val <= 10 && val === st.targetNumber
      })
      if (hit) {
        s.playersRecord[ownerId].score += 2
        s.activePersistentArcana.star[ownerId] = null
        starBonusWinner = { ownerId, matchedNumber: st.targetNumber }
        s.historyLog.unshift(
          `XVII. L’Étoile se réalise (#${st.targetNumber}) : +2 manches immédiates pour son porteur !`,
        )
      }
    }
  }

  // Priority 5: XIV. Tempérance (average of two classic cards; inverted with 0. Le Mat)
  const tempOwners = playerHasEffectiveTarot(s, 14)
  const hasMat = playerHasEffectiveTarot(s, 0).length > 0

  if (tempOwners.length === 1) {
    const tOwner = tempOwners[0]
    const tOpp = getOpponentId(s, tOwner)
    const v0 = getPlayerEffectiveClassicScore(rec0)
    const v1 = getPlayerEffectiveClassicScore(rec1)
    const isIntegerAverage = (v0 + v1) % 2 === 0
    const ownerWins = hasMat ? !isIntegerAverage : isIntegerAverage
    const winnerId = ownerWins ? tOwner : tOpp
    return finalizeRoundOutcome(s, {
      winnerId,
      reason: hasMat
        ? `XIV. Tempérance + 0. Le Mat : moyenne (${(v0 + v1) / 2}) ${isIntegerAverage ? 'entière → adversaire' : 'non entière → tireur'} (+${baseWinPoints}).`
        : `XIV. Tempérance : moyenne (${(v0 + v1) / 2}) ${isIntegerAverage ? 'entière → tireur' : 'non entière → adversaire'} (+${baseWinPoints}).`,
      pointsAwarded: {
        [p0]: winnerId === p0 ? baseWinPoints : 0,
        [p1]: winnerId === p1 ? baseWinPoints : 0,
      },
      cancelled: false,
      starTriggered: starBonusWinner,
    })
  }

  // Standard Duel Comparison (with XI. La Force Joker & 0. Le Mat inversion)
  let winnerId: string | null = null
  let reason = ''
  if (rec0.forceJokerSecured || rec1.forceJokerSecured) {
    if (rec0.forceJokerSecured && rec1.forceJokerSecured) {
      winnerId = null
      reason = 'Double Joker (XI. La Force) : égalité.'
    } else {
      winnerId = rec0.forceJokerSecured ? p0 : p1
      reason = `XI. La Force remporte le duel grâce au Joker imbattable (+${baseWinPoints}).`
    }
  } else {
    const s0 = getPlayerEffectiveClassicScore(rec0)
    const s1 = getPlayerEffectiveClassicScore(rec1)
    if (s0 === s1) {
      winnerId = null
      reason = `Égalité sur le duel (${s0} vs ${s1}) : manche nulle (0 point).`
    } else {
      winnerId = hasMat ? (s0 < s1 ? p0 : p1) : s0 > s1 ? p0 : p1
      reason = hasMat
        ? `0. Le Mat inverse la hiérarchie (${s0} vs ${s1}) : la plus faible l’emporte (+${baseWinPoints}).`
        : `Duel classique (${s0} vs ${s1}) (+${baseWinPoints}).`
    }
  }

  return finalizeRoundOutcome(s, {
    winnerId,
    reason,
    pointsAwarded: {
      [p0]: winnerId === p0 ? baseWinPoints : 0,
      [p1]: winnerId === p1 ? baseWinPoints : 0,
    },
    cancelled: false,
    starTriggered: starBonusWinner,
  })
}

function finalizeRoundOutcome(
  state: Arcane23State,
  opts: {
    winnerId: string | null
    reason: string
    pointsAwarded: Record<string, number>
    cancelled: boolean
    usedGaster?: boolean
    starTriggered?: { ownerId: string; matchedNumber: number }
    wheelFlip?: Arcane23RoundOutcome['wheelFlip']
  },
): Arcane23State {
  const s = cloneState(state)
  const [p0, p1] = s.playerIds

  for (const pid of s.playerIds) {
    const add = opts.pointsAwarded[pid] ?? 0
    if (add > 0) {
      s.playersRecord[pid].score += add
    }
  }

  for (const pid of s.playerIds) {
    const st = s.activePersistentArcana.star[pid]
    if (st && s.roundNumber > st.activatedRound) {
      const rem = st.remainingTurns - 1
      s.activePersistentArcana.star[pid] = rem > 0 ? { ...st, remainingTurns: rem } : null
    }
  }

  s.roundOutcome = {
    roundNumber: s.roundNumber,
    winnerId: opts.winnerId,
    reason: opts.reason,
    pointsAwarded: opts.pointsAwarded,
    cancelled: opts.cancelled,
    usedGaster: Boolean(opts.usedGaster),
    starTriggered: opts.starTriggered,
    wheelFlip: opts.wheelFlip,
  }
  s.presentationStep = 'RESOLVED'

  let matchWinner: string | null = null
  if (opts.usedGaster && opts.winnerId) {
    matchWinner = opts.winnerId
  } else if (s.activePersistentArcana.suddenDeath && opts.winnerId && !opts.cancelled) {
    matchWinner = opts.winnerId
  } else {
    const reachedTarget = s.playerIds.filter((pid) => s.playersRecord[pid].score >= s.targetRoundsToWin)
    if (reachedTarget.length === 1) {
      matchWinner = reachedTarget[0]
    } else if (reachedTarget.length === 2) {
      const a = s.playersRecord[p0].score
      const b = s.playersRecord[p1].score
      if (a !== b) matchWinner = a > b ? p0 : p1
    }
  }

  if (matchWinner) {
    s.winnerId = matchWinner
    s.status = 'finished'
    s.phase = 'FINISHED'
    s.currentTurnUserId = null
    s.historyLog.unshift(`Victoire finale ! ${opts.reason}`)
  } else {
    s.status = 'player_turns'
    s.phase = 'ROUND_END'
    s.currentTurnUserId = s.playerIds[0] ?? null
  }

  return s
}

export function submitDrawChoice(
  state: Arcane23State,
  playerId: string,
  choice: DrawChoice,
  options?: SubmitChoiceOptions,
): Arcane23State {
  if (state.phase !== 'CHOOSING' || state.presentationStep !== 'CHOOSING') return state
  const rec = state.playersRecord[playerId]
  if (!rec || rec.choice !== null) return state

  const constraint = getTarotChoiceConstraint(state, playerId)
  if (choice === 'tarot' && !constraint.canChooseTarot) return state
  if (choice === 'classic' && !constraint.canChooseClassic) return state

  const s = cloneState(state)
  const rng = options?.rng ?? Math.random
  s.playersRecord[playerId].choice = choice

  if (!s.playerIds.every((pid) => s.playersRecord[pid].choice !== null)) {
    return s
  }

  // Clear this turn's active Emperor constraint (remainingTurns was already decremented when owner chose in EMPEROR_CHOICE)
  for (const pid of s.playerIds) {
    const emp = s.activePersistentArcana.emperor[pid]
    if (emp) {
      emp.currentTurnMode = null
      if (emp.remainingTurns <= 0) {
        s.activePersistentArcana.emperor[pid] = null
      }
    }
  }

  const tarotPlayers: string[] = []
  for (let i = 0; i < s.playerIds.length; i++) {
    const pid = s.playerIds[i]
    const pRec = s.playersRecord[pid]
    if (pRec.choice === 'classic') {
      pRec.drawnClassic = drawFromClassicDeck(s, pid, rng)
      pRec.drawnTarot = null
      pRec.effectiveTarot = null
    } else {
      const d10Roll: [number, number, number] =
        options?.forceGasterRoll && tarotPlayers.length === 0
          ? options.forceGasterRoll
          : [rollDie(10, rng) - 1, rollDie(10, rng) - 1, rollDie(10, rng) - 1]
      pRec.gasterRoll = d10Roll

      if (d10Roll[0] === 6 && d10Roll[1] === 6 && d10Roll[2] === 6) {
        pRec.drawnTarot = 666
        pRec.effectiveTarot = 666
        s.historyLog.unshift('ANOMALIE 666 ! 3d10 = 6-6-6 — W. D. Gaster remplace l’Arcane !')
      } else {
        const arc = drawFromTarotDeck(s, rng)
        pRec.drawnTarot = arc
        pRec.effectiveTarot = arc
      }
      tarotPlayers.push(pid)
    }
  }

  s.tarotDrawOrder = orderTarotDrawers(s, tarotPlayers, rng)
  s.phase = 'INTERACTION'
  s.presentationStep = 'CLASSIC_REVEAL'
  s.pendingPrompts = []
  s.currentTurnUserId = s.playerIds[0] ?? null
  return s
}

export function advancePresentationStep(state: Arcane23State, rng: RngFn = Math.random): Arcane23State {
  if (state.pendingPrompts.length > 0) return state
  if (state.phase === 'FINISHED') return state

  if (state.presentationStep === 'CLASSIC_REVEAL') {
    if (state.tarotDrawOrder.length >= 1) {
      return enterTarotSpotlight(state, 0, rng)
    }
    return resolveTurnStrictPriorities(state, rng)
  }

  if (state.presentationStep === 'TAROT_1') {
    const firstActor = state.tarotDrawOrder[0]
    const firstArc = firstActor ? state.playersRecord[firstActor]?.effectiveTarot : null
    const devilEndedRound = firstArc === 15
    const hermitCancelled = firstActor ? state.playersRecord[firstActor]?.ermiteCancelled : false
    if (state.tarotDrawOrder.length >= 2 && !devilEndedRound && !hermitCancelled) {
      return enterTarotSpotlight(state, 1, rng)
    }
    return resolveTurnStrictPriorities(state, rng)
  }

  if (state.presentationStep === 'TAROT_2') {
    return resolveTurnStrictPriorities(state, rng)
  }

  if (state.presentationStep === 'RESOLVED' && state.phase === 'ROUND_END') {
    return advanceToNextRound(state, rng)
  }

  return state
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
      const target = response.targetArcanum
      if (target !== null && s.tarotDiscard.includes(target) && target !== 20 && target !== 666) {
        const idx = s.tarotDiscard.indexOf(target)
        if (idx >= 0) s.tarotDiscard.splice(idx, 1)
        rec.effectiveTarot = target
        s.historyLog.unshift(`XX. Le Jugement réactive #${target} depuis la défausse !`)
        // Insert copied Arcana into the exact current Tarot step WITHOUT skipping stages or drawing future cards
        return prepareSingleTarotStepPrompts(s, playerId, rng)
      }
      rec.effectiveTarot = null
      rec.tarotStepResolved = true
      return s
    }

    case 'GASTER_CHOOSE_WINNER': {
      const [p0, p1] = s.playerIds
      const chosen = s.playerIds.includes(response.chosenWinnerId) ? response.chosenWinnerId : playerId
      rec.tarotStepResolved = true
      s.historyLog.unshift('666. Gaster décrète la victoire finale immédiate !')
      return finalizeRoundOutcome(s, {
        winnerId: chosen,
        reason: '666. W. D. Gaster (1/666) désigne le vainqueur de la partie !',
        pointsAwarded: {
          [p0]: chosen === p0 ? 1 : 0,
          [p1]: chosen === p1 ? 1 : 0,
        },
        cancelled: false,
        usedGaster: true,
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
      if (chosen) consumeSunRevealSlot(s, playerId, 1)
      rec.tarotStepResolved = true
      s.historyLog.unshift('I. Le Bateleur choisit sa carte et replace les 2 autres.')
      return s
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
      s.activePersistentArcana.papesse = {
        ownerId: playerId,
        targetId: oppId,
        remainingDraws: Math.min(3, reordered.length),
      }
      rec.tarotStepResolved = true
      s.historyLog.unshift('II. La Papesse réordonne les 3 premières cartes du deck adverse.')
      return s
    }

    case 'ERMITE_DECIDE': {
      if (response.decision === 'cancel') {
        rec.ermiteCancelled = true
        rec.tarotStepResolved = true
        s.historyLog.unshift('IX. L’Ermite observe le jeu et décide d’annuler la manche.')
      } else {
        rec.tarotStepResolved = true
        s.historyLog.unshift('IX. L’Ermite choisit de disputer la manche.')
      }
      return s
    }

    case 'FORCE_SACRIFICE': {
      if (response.sacrifice && rec.score >= 1) {
        rec.score -= 1
        rec.forceJokerSecured = true
        s.historyLog.unshift('XI. La Force sacrifie 1 manche gagnée : carte transformée en Joker !')
      } else {
        s.historyLog.unshift('XI. La Force conserve ses manches gagnées.')
      }
      rec.tarotStepResolved = true
      return s
    }

    case 'WHEEL_CALL_COIN': {
      const ownerId =
        currentPrompt.type === 'WHEEL_CALL_COIN' ? currentPrompt.ownerId : getOpponentId(s, playerId)
      s.currentTurnUserId = ownerId
      s.pendingPrompts.unshift({
        id: `wheel-flip-${s.roundNumber}-${ownerId}`,
        type: 'WHEEL_FLIP_COIN',
        playerId: ownerId,
        callerId: playerId,
        call: response.call,
      })
      s.historyLog.unshift(
        `X. La Roue de la Fortune : ${response.call === 'heads' ? 'Face' : 'Pile'} annoncé. Le tireur peut maintenant lancer la pièce 3D !`,
      )
      return s
    }

    case 'WHEEL_FLIP_COIN': {
      const callerId =
        currentPrompt.type === 'WHEEL_FLIP_COIN'
          ? currentPrompt.callerId
          : getOpponentId(s, playerId)
      const call = currentPrompt.type === 'WHEEL_FLIP_COIN' ? currentPrompt.call : 'heads'
      const result = flipCoin(rng)
      const winnerId = result === call ? callerId : playerId
      const coinFlipNonce = `wheel-${s.roundNumber}-${Date.now()}-${Math.floor(rng() * 100000)}`
      s.playersRecord[playerId].tarotStepResolved = true
      s.pendingWheelFlip = {
        ownerId: playerId,
        callerId,
        call,
        result,
        winnerId,
        coinFlipNonce,
      }
      s.historyLog.unshift(
        `X. La Roue de la Fortune (${result === 'heads' ? 'Face' : 'Pile'}) : +2 manches pour le gagnant du lancer !`,
      )
      return s
    }

    case 'STAR_PICK_NUMBER': {
      const num = Math.max(2, Math.min(10, Math.round(response.number)))
      s.activePersistentArcana.star[playerId] = {
        targetNumber: num,
        remainingTurns: 2,
        activatedRound: s.roundNumber,
      }
      rec.tarotStepResolved = true
      s.historyLog.unshift(`XVII. L’Étoile surveille le chiffre ${num} pour les 2 prochains tours.`)
      return s
    }

    case 'EMPEROR_CHOOSE_LOCK': {
      const oppId = getOpponentId(s, playerId)
      const emp = s.activePersistentArcana.emperor[oppId]
      if (emp) {
        emp.currentTurnMode = response.mode
        emp.remainingTurns = Math.max(0, emp.remainingTurns - 1)
      }
      s.historyLog.unshift(
        `IV. L’Empereur décrète pour ce tour : ${response.mode === 'force_tarot' ? 'Tarot imposé' : 'Tarot interdit'} à l’adversaire.`,
      )
      if (s.pendingPrompts.length > 0) {
        s.phase = 'INTERACTION'
        s.presentationStep = 'EMPEROR_CHOICE'
        s.currentTurnUserId = s.pendingPrompts[0].playerId
      } else {
        s.phase = 'CHOOSING'
        s.presentationStep = 'CHOOSING'
        s.currentTurnUserId = s.playerIds[0] ?? null
      }
      return s
    }
  }
}

export function advanceToNextRound(state: Arcane23State, rng: RngFn = Math.random): Arcane23State {
  if (state.phase !== 'ROUND_END' || state.status === 'finished') return state
  const s = cloneState(state)
  const diablePlayed = playerHasEffectiveTarot(s, 15).length > 0

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
      const isPersistentCorner =
        (rec.drawnTarot === 18 && s.activePersistentArcana.moon) ||
        (rec.drawnTarot === 19 && Boolean(s.activePersistentArcana.sun)) ||
        (rec.drawnTarot === 17 && Boolean(s.activePersistentArcana.star[pid])) ||
        (rec.drawnTarot === 4 &&
          Object.values(s.activePersistentArcana.emperor).some(
            (e) => e && e.ownerId === pid && e.remainingTurns > 0,
          ))
      if (!isPersistentCorner) {
        s.tarotDiscard.push(rec.drawnTarot)
      }
    }

    rec.tarotCooldown = diablePlayed ? false : rec.choice === 'tarot' && !rec.noCooldownNextTurn
    rec.noCooldownNextTurn = false
    rec.choice = null
    rec.loversCappedSum = null
    rec.chariotBonus = 0
    rec.drawnTarot = null
    rec.effectiveTarot = null
    rec.tarotRevealed = false
    rec.tarotStepResolved = false
    rec.gasterRoll = null
    rec.forceJokerSecured = false
    rec.ermiteCancelled = false
  }

  if (s.tarotDeck.length === 0 && s.tarotDiscard.length > 0) {
    s.tarotDeck = shuffleArray(s.tarotDiscard, rng)
    s.tarotDiscard = []
  }

  s.roundNumber += 1
  s.tarotDrawOrder = []
  s.roundOutcome = null
  s.pendingWheelFlip = null
  s.pendingPrompts = []

  // Check if IV. L'Empereur triggers an EMPEROR_CHOICE prompt at the start of this turn
  const emperorPrompts: Arcane23Prompt[] = []
  for (const targetId of s.playerIds) {
    const emp = s.activePersistentArcana.emperor[targetId]
    if (emp) {
      emp.currentTurnMode = null
      if (emp.remainingTurns > 0) {
        emperorPrompts.push({
          id: `emperor-turn-${s.roundNumber}-${emp.ownerId}`,
          type: 'EMPEROR_CHOOSE_LOCK',
          playerId: emp.ownerId,
          opponentId: targetId,
          remainingTurns: emp.remainingTurns,
        })
      } else {
        s.activePersistentArcana.emperor[targetId] = null
      }
    }
  }

  if (emperorPrompts.length > 0) {
    s.phase = 'INTERACTION'
    s.presentationStep = 'EMPEROR_CHOICE'
    s.pendingPrompts = emperorPrompts
    s.currentTurnUserId = emperorPrompts[0].playerId
    s.historyLog.unshift(
      `Manche ${s.roundNumber} — Décret de IV. L’Empereur avant le choix secret.`,
    )
  } else {
    s.phase = 'CHOOSING'
    s.presentationStep = 'CHOOSING'
    s.currentTurnUserId = s.playerIds[0] ?? null
    s.historyLog.unshift(`Manche ${s.roundNumber} — Faites votre choix en secret.`)
  }
  return s
}

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
      return {
        type: 'BATELEUR_PICK_ORDER',
        chosenCardId: sorted[0]?.id ?? '',
        remainingOrder: sorted.slice(1).map((c) => c.id),
      }
    }
    case 'PAPESSE_REORDER_OPPONENT':
      return {
        type: 'PAPESSE_REORDER_OPPONENT',
        orderedCardIds: [...prompt.topCards]
          .sort((a, b) => getClassicCardNumericValue(a) - getClassicCardNumericValue(b))
          .map((c) => c.id),
      }
    case 'ERMITE_DECIDE': {
      const oppVal = prompt.observedOpponentCard
        ? getClassicCardNumericValue(prompt.observedOpponentCard)
        : 7
      return { type: 'ERMITE_DECIDE', decision: oppVal <= 11 ? 'play' : 'cancel' }
    }
    case 'FORCE_SACRIFICE':
      return { type: 'FORCE_SACRIFICE', sacrifice: prompt.currentScore >= 2 }
    case 'WHEEL_CALL_COIN':
      return { type: 'WHEEL_CALL_COIN', call: 'heads' }
    case 'WHEEL_FLIP_COIN':
      return { type: 'WHEEL_FLIP_COIN' }
    case 'STAR_PICK_NUMBER':
      return { type: 'STAR_PICK_NUMBER', number: 7 }
    case 'EMPEROR_CHOOSE_LOCK':
      return { type: 'EMPEROR_CHOOSE_LOCK', mode: 'forbid_tarot' }
  }
}
