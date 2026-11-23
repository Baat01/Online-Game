import { describe, expect, it } from 'vitest'
import type { Card } from '@/games/_shared/deck'
import { createSeededRng } from '@/games/_shared/randomUtils'
import {
  ARCANA_RULES_CATALOG,
  advancePresentationStep,
  advanceToNextRound,
  canPlayerChooseTarot,
  createInitialArcane23State,
  getClassicCardNumericValue,
  getPlayerEffectiveClassicScore,
  resolveArcanePrompt,
  submitDrawChoice,
  type Arcane23State,
} from './arcane23Engine'

const P1 = 'player-1'
const P2 = 'player-2'

function card(suit: Card['suit'], rank: Card['rank'], tag = ''): Card {
  return { id: `${suit}-${rank}${tag ? `-${tag}` : ''}`, suit, rank }
}

function setupRiggedMatch(opts?: {
  p1Deck?: Card[]
  p2Deck?: Card[]
  tarotDeck?: number[]
  tarotDiscard?: number[]
}): Arcane23State {
  const s = createInitialArcane23State([P1, P2], P1, createSeededRng('arcane23-seed'))
  if (opts?.p1Deck) s.playersRecord[P1].classicDeck = [...opts.p1Deck]
  if (opts?.p2Deck) s.playersRecord[P2].classicDeck = [...opts.p2Deck]
  if (opts?.tarotDeck) s.tarotDeck = [...opts.tarotDeck]
  if (opts?.tarotDiscard) s.tarotDiscard = [...opts.tarotDiscard]
  return s
}

function runStepsUntilResolved(state: Arcane23State, rng = () => 0.1): Arcane23State {
  let s = state
  let guard = 0
  while (s.presentationStep !== 'RESOLVED' && guard < 6) {
    s = advancePresentationStep(s, rng)
    guard++
  }
  return s
}

describe('Le 23e Arcane Engine', () => {
  it('initializes with 52-card personal decks, 22-card shared Tarot deck, full catalog, and 5 rounds to win', () => {
    const state = createInitialArcane23State([P1, P2], P1, createSeededRng(1))
    expect(state.phase).toBe('CHOOSING')
    expect(state.presentationStep).toBe('CHOOSING')
    expect(state.targetRoundsToWin).toBe(5)
    expect(state.playersRecord[P1].classicDeck).toHaveLength(52)
    expect(state.playersRecord[P2].classicDeck).toHaveLength(52)
    expect(state.tarotDeck).toHaveLength(22)
    expect(Object.keys(ARCANA_RULES_CATALOG)).toHaveLength(23)
    expect(getClassicCardNumericValue(card('spades', 'A'))).toBe(14)
    expect(getClassicCardNumericValue(card('hearts', '2'))).toBe(2)
  })

  it('progresses sequentially (CLASSIC_REVEAL -> TAROT_1 -> TAROT_2 -> RESOLVED) and enforces cooldown/recycling', () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('spades', '9')],
      tarotDeck: [8, 3],
    })
    s.playersRecord[P1].classicDiscard = [card('clubs', 'Q')]

    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    expect(s.presentationStep).toBe('CLASSIC_REVEAL')

    s = advancePresentationStep(s)
    expect(s.presentationStep).toBe('RESOLVED')
    expect(s.roundOutcome?.winnerId).toBe(P1)
    expect(s.playersRecord[P1].score).toBe(1)

    s = advanceToNextRound(s)
    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'tarot', { rng: () => 0.1 })
    expect(s.presentationStep).toBe('CLASSIC_REVEAL')
    s = advancePresentationStep(s, () => 0.1)
    expect(s.presentationStep).toBe('TAROT_1')
    s = advancePresentationStep(s, () => 0.1)
    expect(s.presentationStep).toBe('TAROT_2')
    s = advancePresentationStep(s, () => 0.1)
    expect(s.presentationStep).toBe('RESOLVED')

    s = advanceToNextRound(s)
    expect(canPlayerChooseTarot(s, P1)).toBe(false)
    expect(canPlayerChooseTarot(s, P2)).toBe(false)
  })

  it('Priority 0 & 1: 666. Gaster crowns match winner immediately; XIII. Death loses match immediately', () => {
    let sGaster = setupRiggedMatch({ tarotDeck: [5] })
    sGaster = submitDrawChoice(sGaster, P1, 'tarot')
    sGaster = submitDrawChoice(sGaster, P2, 'classic', { forceGasterRoll: [6, 6, 6] })
    sGaster = advancePresentationStep(sGaster)
    expect(sGaster.pendingPrompts[0]?.type).toBe('GASTER_CHOOSE_WINNER')
    sGaster = resolveArcanePrompt(sGaster, P1, {
      type: 'GASTER_CHOOSE_WINNER',
      chosenWinnerId: P1,
    })
    expect(sGaster.status).toBe('finished')
    expect(sGaster.winnerId).toBe(P1)

    let sDeath = setupRiggedMatch({ tarotDeck: [13] })
    sDeath = submitDrawChoice(sDeath, P1, 'tarot')
    sDeath = submitDrawChoice(sDeath, P2, 'classic', { rng: () => 0.1 })
    sDeath = advancePresentationStep(sDeath, () => 0.1)
    expect(sDeath.status).toBe('finished')
    expect(sDeath.winnerId).toBe(P2)
  })

  it('Priority 2: XV. Le Diable cancels round, enables Mort Subite, and resets Tarot cooldown for BOTH players', () => {
    let s = setupRiggedMatch({
      p1Deck: [card('spades', 'A')],
      p2Deck: [card('clubs', 'A'), card('diamonds', '3')],
      tarotDeck: [15, 3],
    })
    s.playersRecord[P2].tarotCooldown = true

    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'classic', { rng: () => 0.1 })
    s = runStepsUntilResolved(s)

    expect(s.roundOutcome?.cancelled).toBe(true)
    expect(s.activePersistentArcana.suddenDeath).toBe(true)

    s = advanceToNextRound(s)
    expect(s.playersRecord[P1].tarotCooldown).toBe(false)
    expect(s.playersRecord[P2].tarotCooldown).toBe(false)
    expect(canPlayerChooseTarot(s, P1)).toBe(true)
    expect(canPlayerChooseTarot(s, P2)).toBe(true)

    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    s = runStepsUntilResolved(s)
    expect(s.status).toBe('finished')
    expect(s.winnerId).toBe(P1)
  })

  it('Priority 3 & 4: XXI. Le Monde wins round + reshuffles discards; 0. Le Mat inverts hierarchy (2 > A)', () => {
    let sWorld = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [21],
      tarotDiscard: [5, 6],
    })
    sWorld.playersRecord[P1].classicDiscard = [card('clubs', '9')]
    sWorld = submitDrawChoice(sWorld, P1, 'tarot')
    sWorld = submitDrawChoice(sWorld, P2, 'classic', { rng: () => 0.1 })
    sWorld = runStepsUntilResolved(sWorld)
    expect(sWorld.roundOutcome?.winnerId).toBe(P1)
    expect(sWorld.playersRecord[P1].classicDiscard).toHaveLength(0)
    expect(sWorld.tarotDiscard).toHaveLength(0)

    let sMat = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [0],
    })
    sMat = submitDrawChoice(sMat, P1, 'tarot')
    sMat = submitDrawChoice(sMat, P2, 'classic', { rng: () => 0.1 })
    sMat = runStepsUntilResolved(sMat)
    expect(sMat.roundOutcome?.winnerId).toBe(P1)
  })

  it('Priority 5 & 6: V. Le Pape (+1 each), X. La Roue (+2), XIV. Tempérance (average + Le Mat flip), III. Impératrice (+2)', () => {
    let sPape = setupRiggedMatch({ tarotDeck: [5, 0] })
    sPape = submitDrawChoice(sPape, P1, 'tarot')
    sPape = submitDrawChoice(sPape, P2, 'tarot', { rng: () => 0.1 })
    sPape = runStepsUntilResolved(sPape)
    expect(sPape.playersRecord[P1].score).toBe(1)
    expect(sPape.playersRecord[P2].score).toBe(1)

    let sWheel = setupRiggedMatch({ tarotDeck: [10, 0] })
    sWheel = submitDrawChoice(sWheel, P1, 'tarot')
    sWheel = submitDrawChoice(sWheel, P2, 'tarot', { rng: () => 0.1 })
    sWheel = advancePresentationStep(sWheel, () => 0.1)
    expect(sWheel.pendingPrompts[0]?.type).toBe('WHEEL_CALL_COIN')
    // Step 1: Opponent (P2) calls Heads
    sWheel = resolveArcanePrompt(sWheel, P2, { type: 'WHEEL_CALL_COIN', call: 'heads' }, () => 0.1)
    // Step 2: Drawer (P1) receives WHEEL_FLIP_COIN prompt to launch the 3D coin
    expect(sWheel.pendingPrompts[0]?.type).toBe('WHEEL_FLIP_COIN')
    expect(sWheel.pendingPrompts[0]?.playerId).toBe(P1)
    sWheel = resolveArcanePrompt(sWheel, P1, { type: 'WHEEL_FLIP_COIN' }, () => 0.1)
    expect(sWheel.pendingPrompts).toHaveLength(0)
    expect(sWheel.pendingWheelFlip?.ownerId).toBe(P1)
    expect(sWheel.pendingWheelFlip?.coinFlipNonce).toBeTruthy()
    expect(sWheel.pendingWheelFlip?.result).toBe('heads')
    expect(sWheel.pendingWheelFlip?.winnerId).toBe(P2)
    sWheel = runStepsUntilResolved(sWheel)
    expect(sWheel.playersRecord[P2].score).toBe(2)

    let sTempEven = setupRiggedMatch({
      p1Deck: [card('hearts', '4')],
      p2Deck: [card('spades', '8')],
      tarotDeck: [14],
    })
    sTempEven = submitDrawChoice(sTempEven, P1, 'tarot')
    sTempEven = submitDrawChoice(sTempEven, P2, 'classic', { rng: () => 0.1 })
    sTempEven = runStepsUntilResolved(sTempEven)
    expect(sTempEven.roundOutcome?.winnerId).toBe(P1)

    let sTempMat = setupRiggedMatch({
      p1Deck: [card('hearts', '4')],
      p2Deck: [card('spades', '8')],
      tarotDeck: [14, 0],
    })
    sTempMat = submitDrawChoice(sTempMat, P1, 'tarot')
    sTempMat = submitDrawChoice(sTempMat, P2, 'tarot', { rng: () => 0.1 })
    sTempMat = runStepsUntilResolved(sTempMat)
    expect(sTempMat.roundOutcome?.winnerId).toBe(P2)

    let sImp = setupRiggedMatch({
      p1Deck: [card('hearts', 'A')],
      p2Deck: [card('clubs', '3')],
      tarotDeck: [3],
    })
    sImp = submitDrawChoice(sImp, P1, 'tarot')
    sImp = submitDrawChoice(sImp, P2, 'classic', { rng: () => 0.1 })
    sImp = runStepsUntilResolved(sImp)
    expect(sImp.playersRecord[P1].score).toBe(2)
  })

  it('Priority 7: VIII. La Justice equalizes leader downward; XVI. La Maison Dieu removes 2 rounds (min 0)', () => {
    let sJust = setupRiggedMatch({
      p1Deck: [card('hearts', '5')],
      p2Deck: [card('clubs', '5')],
      tarotDeck: [8],
    })
    sJust.playersRecord[P1].score = 4
    sJust.playersRecord[P2].score = 1
    sJust = submitDrawChoice(sJust, P1, 'tarot')
    sJust = submitDrawChoice(sJust, P2, 'classic', { rng: () => 0.1 })
    sJust = runStepsUntilResolved(sJust)
    expect(sJust.playersRecord[P1].score).toBe(1)

    let sTower = setupRiggedMatch({
      p1Deck: [card('hearts', '5')],
      p2Deck: [card('clubs', '5')],
      tarotDeck: [16],
    })
    sTower.playersRecord[P1].score = 3
    sTower.playersRecord[P2].score = 1
    sTower = submitDrawChoice(sTower, P1, 'tarot')
    sTower = submitDrawChoice(sTower, P2, 'classic', { rng: () => 0.1 })
    sTower = runStepsUntilResolved(sTower)
    expect(sTower.playersRecord[P1].score).toBe(1)
    expect(sTower.playersRecord[P2].score).toBe(0)
  })

  it("Priority 8 & 9: I. Bateleur, VI. Amoureux, VII. Chariot, IX. Ermite (vs Classic & vs Tarot), XI. Force, XII. Pendu", () => {
    let sLoveNum = setupRiggedMatch({
      p1Deck: [card('hearts', '7'), card('diamonds', '8')],
      p2Deck: [card('clubs', '9')],
      tarotDeck: [6],
    })
    sLoveNum = submitDrawChoice(sLoveNum, P1, 'tarot')
    sLoveNum = submitDrawChoice(sLoveNum, P2, 'classic', { rng: () => 0.1 })
    sLoveNum = runStepsUntilResolved(sLoveNum)
    expect(getPlayerEffectiveClassicScore(sLoveNum.playersRecord[P1])).toBe(10)
    expect(sLoveNum.roundOutcome?.winnerId).toBe(P1)

    let sLoveFig = setupRiggedMatch({
      p1Deck: [card('hearts', '4'), card('diamonds', 'Q')],
      p2Deck: [card('clubs', '10')],
      tarotDeck: [6],
    })
    sLoveFig = submitDrawChoice(sLoveFig, P1, 'tarot')
    sLoveFig = submitDrawChoice(sLoveFig, P2, 'classic', { rng: () => 0.1 })
    sLoveFig = runStepsUntilResolved(sLoveFig)
    expect(getPlayerEffectiveClassicScore(sLoveFig.playersRecord[P1])).toBe(12)

    let sChar = setupRiggedMatch({
      p1Deck: [card('hearts', '9')],
      p2Deck: [card('clubs', 'J')],
      tarotDeck: [7],
    })
    sChar.playersRecord[P1].score = 3
    sChar = submitDrawChoice(sChar, P1, 'tarot')
    sChar = submitDrawChoice(sChar, P2, 'classic', { rng: () => 0.1 })
    sChar = runStepsUntilResolved(sChar)
    expect(sChar.roundOutcome?.winnerId).toBe(P1)

    // IX. L'Ermite vs Classic: observes opponent's revealed classic card & can cancel
    let sErm = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [9],
    })
    sErm = submitDrawChoice(sErm, P1, 'tarot')
    sErm = submitDrawChoice(sErm, P2, 'classic', { rng: () => 0.1 })
    sErm = advancePresentationStep(sErm, () => 0.1)
    expect(sErm.pendingPrompts[0]?.type).toBe('ERMITE_DECIDE')
    if (sErm.pendingPrompts[0]?.type === 'ERMITE_DECIDE') {
      expect(sErm.pendingPrompts[0].observedOpponentCard?.rank).toBe('A')
      expect(sErm.pendingPrompts[0].opponentChoseTarot).toBe(false)
    }
    sErm = resolveArcanePrompt(sErm, P1, { type: 'ERMITE_DECIDE', decision: 'cancel' })
    sErm = runStepsUntilResolved(sErm)
    expect(sErm.roundOutcome?.cancelled).toBe(true)

    // IX. L'Ermite vs Tarot: opponent has NOT drawn classic card yet, yet Ermite STILL gets Play/Cancel prompt!
    let sErmVsTarot = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('spades', '2')],
      tarotDeck: [9, 3], // P1 Hermit, P2 Empress
    })
    sErmVsTarot = submitDrawChoice(sErmVsTarot, P1, 'tarot')
    sErmVsTarot = submitDrawChoice(sErmVsTarot, P2, 'tarot', { rng: () => 0.1 })
    sErmVsTarot = advancePresentationStep(sErmVsTarot, () => 0.1) // TAROT_1 = P1 Hermit
    expect(sErmVsTarot.presentationStep).toBe('TAROT_1')
    expect(sErmVsTarot.pendingPrompts[0]?.type).toBe('ERMITE_DECIDE')
    if (sErmVsTarot.pendingPrompts[0]?.type === 'ERMITE_DECIDE') {
      expect(sErmVsTarot.pendingPrompts[0].opponentChoseTarot).toBe(true)
      expect(sErmVsTarot.pendingPrompts[0].observedOpponentCard).toBeNull()
    }
    expect(sErmVsTarot.playersRecord[P2].drawnClassic).toBeNull()
    sErmVsTarot = resolveArcanePrompt(sErmVsTarot, P1, { type: 'ERMITE_DECIDE', decision: 'play' })
    // Still on TAROT_1, advancing shows TAROT_2 (Empress), then RESOLVED
    sErmVsTarot = advancePresentationStep(sErmVsTarot, () => 0.1)
    expect(sErmVsTarot.presentationStep).toBe('TAROT_2')
    sErmVsTarot = advancePresentationStep(sErmVsTarot, () => 0.1)
    expect(sErmVsTarot.presentationStep).toBe('RESOLVED')
    expect(sErmVsTarot.playersRecord[P1].score).toBe(2)

    let sPendu = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [12],
    })
    sPendu = submitDrawChoice(sPendu, P1, 'tarot')
    sPendu = submitDrawChoice(sPendu, P2, 'classic', { rng: () => 0.1 })
    sPendu = runStepsUntilResolved(sPendu)
    expect(sPendu.playersRecord[P1].drawnClassic?.rank).toBe('A')
    expect(sPendu.roundOutcome?.winnerId).toBe(P1)

    let sForce = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [11],
    })
    sForce.playersRecord[P1].score = 2
    sForce = submitDrawChoice(sForce, P1, 'tarot')
    sForce = submitDrawChoice(sForce, P2, 'classic', { rng: () => 0.1 })
    sForce = advancePresentationStep(sForce, () => 0.1)
    expect(sForce.pendingPrompts[0]?.type).toBe('FORCE_SACRIFICE')
    sForce = resolveArcanePrompt(sForce, P1, { type: 'FORCE_SACRIFICE', sacrifice: true })
    sForce = runStepsUntilResolved(sForce)
    expect(sForce.roundOutcome?.winnerId).toBe(P1)
    expect(sForce.playersRecord[P1].score).toBe(2)
  })

  it('XIX. Le Soleil reveals ONLY the next 3 cards per deck (3 -> 2 -> 1 -> 0) and then disappears', () => {
    let s = setupRiggedMatch({
      p1Deck: [
        card('hearts', '4'),
        card('hearts', '5'),
        card('hearts', '6'),
        card('hearts', '7'),
        card('hearts', '8'),
      ],
      p2Deck: [
        card('clubs', '4'),
        card('clubs', '5'),
        card('clubs', '6'),
        card('clubs', '7'),
        card('clubs', '8'),
      ],
      tarotDeck: [19],
    })
    // Round 1: P1 draws XIX. Le Soleil, P2 draws Classic (consumes 1 card each -> 4 remain each)
    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'classic', { rng: () => 0.1 })
    s = runStepsUntilResolved(s)
    expect(s.activePersistentArcana.sun?.revealedCardsRemaining[P1]).toBe(3)
    expect(s.activePersistentArcana.sun?.revealedCardsRemaining[P2]).toBe(3)

    // Draw 1 card per player -> 2 remaining
    s = advanceToNextRound(s)
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    s = runStepsUntilResolved(s)
    expect(s.activePersistentArcana.sun?.revealedCardsRemaining[P1]).toBe(2)
    expect(s.activePersistentArcana.sun?.revealedCardsRemaining[P2]).toBe(2)

    // Draw 2nd card per player -> 1 remaining
    s = advanceToNextRound(s)
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    s = runStepsUntilResolved(s)
    expect(s.activePersistentArcana.sun?.revealedCardsRemaining[P1]).toBe(1)
    expect(s.activePersistentArcana.sun?.revealedCardsRemaining[P2]).toBe(1)

    // Draw 3rd card per player -> 0 remaining -> Sun disappears!
    s = advanceToNextRound(s)
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    s = runStepsUntilResolved(s)
    expect(s.activePersistentArcana.sun).toBeNull()
  })

  it("IV. L'Empereur triggers an interactive EMPEROR_CHOICE at the start of EACH of the next 2 turns", () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', '3'), card('hearts', '4'), card('hearts', '5'), card('hearts', '6')],
      p2Deck: [card('clubs', '3'), card('clubs', '4'), card('clubs', '5'), card('clubs', '6')],
      tarotDeck: [4, 3, 8, 5],
    })
    // Round 1: P1 draws IV. L'Empereur -> NO prompt during Round 1!
    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'classic', { rng: () => 0.1 })
    s = advancePresentationStep(s, () => 0.1) // TAROT_1 = Emperor
    expect(s.pendingPrompts).toHaveLength(0)
    s = runStepsUntilResolved(s)
    expect(s.activePersistentArcana.emperor[P2]?.remainingTurns).toBe(2)

    // Start of Round 2 -> EMPEROR_CHOICE for P1 (Turn 1 of 2): choose force_tarot (overrides cooldown!)
    s = advanceToNextRound(s)
    expect(s.presentationStep).toBe('EMPEROR_CHOICE')
    expect(s.pendingPrompts[0]?.type).toBe('EMPEROR_CHOOSE_LOCK')
    s.playersRecord[P2].tarotCooldown = true
    s = resolveArcanePrompt(s, P1, { type: 'EMPEROR_CHOOSE_LOCK', mode: 'force_tarot' })
    expect(s.presentationStep).toBe('CHOOSING')
    expect(canPlayerChooseTarot(s, P2)).toBe(true)

    // Play Round 2 (P2 forced to choose tarot)
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'tarot', { rng: () => 0.1 })
    s = runStepsUntilResolved(s)

    // Start of Round 3 -> EMPEROR_CHOICE AGAIN for P1 (Turn 2 of 2): choose forbid_tarot!
    s = advanceToNextRound(s)
    expect(s.presentationStep).toBe('EMPEROR_CHOICE')
    expect(s.pendingPrompts[0]?.type).toBe('EMPEROR_CHOOSE_LOCK')
    s = resolveArcanePrompt(s, P1, { type: 'EMPEROR_CHOOSE_LOCK', mode: 'forbid_tarot' })
    expect(s.presentationStep).toBe('CHOOSING')
    expect(canPlayerChooseTarot(s, P2)).toBe(false)

    // Play Round 3
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    s = runStepsUntilResolved(s)

    // Start of Round 4 -> Emperor expired, directly CHOOSING!
    s = advanceToNextRound(s)
    expect(s.presentationStep).toBe('CHOOSING')
    expect(s.activePersistentArcana.emperor[P2]).toBeNull()
  })

  it("XX. Le Jugement copying IX. L'Ermite vs a Tarot opponent never leaks future classic card or skips TAROT_2", () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('clubs', 'A')],
      tarotDeck: [20, 3], // P1 Judgment, P2 Empress
      tarotDiscard: [9], // IX. L'Ermite in discard
    })

    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'tarot', { rng: () => 0.1 })
    expect(s.presentationStep).toBe('CLASSIC_REVEAL')

    // TAROT_1 = P1 Judgment (rng 0.1 orders P1 first)
    s = advancePresentationStep(s, () => 0.1)
    expect(s.presentationStep).toBe('TAROT_1')
    expect(s.pendingPrompts[0]?.type).toBe('JUDGMENT_COPY_DISCARD')
    // Opponent P2 has NOT drawn their classic card yet
    expect(s.playersRecord[P2].drawnClassic).toBeNull()

    // Confirm copying IX. L'Ermite -> transitions cleanly to ERMITE_DECIDE without advancing turn or drawing P2's card!
    s = resolveArcanePrompt(s, P1, { type: 'JUDGMENT_COPY_DISCARD', targetArcanum: 9 })
    expect(s.presentationStep).toBe('TAROT_1')
    expect(s.pendingPrompts[0]?.type).toBe('ERMITE_DECIDE')
    if (s.pendingPrompts[0]?.type === 'ERMITE_DECIDE') {
      expect(s.pendingPrompts[0].opponentChoseTarot).toBe(true)
      expect(s.pendingPrompts[0].observedOpponentCard).toBeNull()
    }
    expect(s.playersRecord[P2].drawnClassic).toBeNull()

    // P1 chooses to play -> still on TAROT_1 until user clicks to see TAROT_2 (Empress)
    s = resolveArcanePrompt(s, P1, { type: 'ERMITE_DECIDE', decision: 'play' })
    expect(s.presentationStep).toBe('TAROT_1')
    expect(s.playersRecord[P2].drawnClassic).toBeNull()

    // Click to TAROT_2 (P2's Empress), then click to RESOLVED (final classic cards drawn & compared)
    s = advancePresentationStep(s, () => 0.1)
    expect(s.presentationStep).toBe('TAROT_2')
    s = advancePresentationStep(s, () => 0.1)
    expect(s.presentationStep).toBe('RESOLVED')
    expect(s.playersRecord[P2].drawnClassic?.rank).toBe('A')
    expect(s.playersRecord[P2].score).toBe(2)
  })

  it("Priority 10: XVII. L'Étoile (+2 on next 2 turns), XVIII. La Lune, and XX. Le Jugement empty discard", () => {
    let sStar = setupRiggedMatch({
      p1Deck: [card('hearts', 'A'), card('clubs', '4')],
      p2Deck: [card('spades', '2'), card('diamonds', '7')],
      tarotDeck: [17],
    })
    sStar = submitDrawChoice(sStar, P1, 'tarot')
    sStar = submitDrawChoice(sStar, P2, 'classic', { rng: () => 0.1 })
    sStar = advancePresentationStep(sStar, () => 0.1)
    sStar = resolveArcanePrompt(sStar, P1, { type: 'STAR_PICK_NUMBER', number: 7 })
    sStar = runStepsUntilResolved(sStar)
    sStar = advanceToNextRound(sStar)
    sStar = submitDrawChoice(sStar, P1, 'classic')
    sStar = submitDrawChoice(sStar, P2, 'classic')
    sStar = runStepsUntilResolved(sStar)
    expect(sStar.roundOutcome?.starTriggered).toEqual({ ownerId: P1, matchedNumber: 7 })
    expect(sStar.playersRecord[P1].score).toBe(3)
    expect(sStar.activePersistentArcana.star[P1]).toBeNull()

    let sMoon = setupRiggedMatch({ tarotDeck: [18] })
    sMoon = submitDrawChoice(sMoon, P1, 'tarot')
    sMoon = submitDrawChoice(sMoon, P2, 'classic', { rng: () => 0.1 })
    sMoon = runStepsUntilResolved(sMoon)
    expect(sMoon.activePersistentArcana.moon).toBe(true)

    let sJudgEmpty = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('clubs', '4')],
      tarotDeck: [20],
      tarotDiscard: [],
    })
    sJudgEmpty = submitDrawChoice(sJudgEmpty, P1, 'tarot')
    sJudgEmpty = submitDrawChoice(sJudgEmpty, P2, 'classic', { rng: () => 0.1 })
    sJudgEmpty = runStepsUntilResolved(sJudgEmpty)
    expect(sJudgEmpty.roundOutcome?.winnerId).toBe(P1)
    expect(sJudgEmpty.playersRecord[P1].score).toBe(1)
  })
})
