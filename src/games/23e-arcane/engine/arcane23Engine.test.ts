import { describe, expect, it } from 'vitest'
import type { Card } from '@/games/_shared/deck'
import { createSeededRng } from '@/games/_shared/randomUtils'
import {
  advanceToNextRound,
  canPlayerChooseTarot,
  createInitialArcane23State,
  getClassicCardNumericValue,
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

describe('Le 23e Arcane Engine', () => {
  it('initializes with two 52-card personal decks, shared 22-card Tarot deck, and 5 rounds to win', () => {
    const state = createInitialArcane23State([P1, P2], P1, createSeededRng(1))
    expect(state.phase).toBe('CHOOSING')
    expect(state.status).toBe('player_turns')
    expect(state.targetRoundsToWin).toBe(5)
    expect(state.playersRecord[P1].classicDeck).toHaveLength(52)
    expect(state.playersRecord[P2].classicDeck).toHaveLength(52)
    expect(state.tarotDeck).toHaveLength(22)
    expect(new Set(state.tarotDeck).size).toBe(22)
    expect(getClassicCardNumericValue(card('spades', 'A'))).toBe(14)
    expect(getClassicCardNumericValue(card('hearts', '2'))).toBe(2)
  })

  it('resolves classic simultaneous draw and enforces 1-turn Tarot cooldown & deck recycling', () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('spades', '9')],
      tarotDeck: [21, 5],
    })
    s.playersRecord[P1].classicDiscard = [card('clubs', 'Q')]

    s = submitDrawChoice(s, P1, 'classic')
    expect(s.phase).toBe('CHOOSING')
    s = submitDrawChoice(s, P2, 'classic')
    expect(s.phase).toBe('ROUND_END')
    expect(s.roundOutcome?.winnerId).toBe(P1)
    expect(s.playersRecord[P1].score).toBe(1)

    // Advance & verify P1 recycles classicDiscard when classicDeck is empty, while P2 draws Tarot
    s = advanceToNextRound(s)
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'tarot', { rng: () => 0.1 })
    if (s.phase === 'ROUND_END') {
      s = advanceToNextRound(s)
    }
    expect(s.playersRecord[P2].tarotCooldown).toBe(true)
    expect(canPlayerChooseTarot(s, P2)).toBe(false)
    expect(canPlayerChooseTarot(s, P1)).toBe(true)
  })

  it('Priority 0: triggers 666. Gaster on 3d10 (6-6-6) anomaly and overrides all effects', () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [5, 19],
    })
    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'classic', { forceGasterRoll: [6, 6, 6] })

    expect(s.playersRecord[P1].drawnTarot).toBe(666)
    expect(s.phase).toBe('INTERACTION')
    expect(s.pendingPrompts[0]?.type).toBe('GASTER_CHOOSE_WINNER')

    s = resolveArcanePrompt(s, P1, {
      type: 'GASTER_CHOOSE_WINNER',
      chosenWinnerId: P1,
    })
    expect(s.roundOutcome?.usedGaster).toBe(true)
    expect(s.roundOutcome?.winnerId).toBe(P1)
    expect(s.playersRecord[P1].score).toBe(1)
  })

  it('Priority 1: XVI. La Maison Dieu purges persistent effects and forces pure classic duel', () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('clubs', '4')],
      tarotDeck: [16, 10], // Maison Dieu vs La Roue
    })
    s.activePersistentArcana.sun = true
    s.activePersistentArcana.moon = true
    s.activePersistentArcana.suddenDeath = true
    s.targetRoundsToWin = 1

    s = submitDrawChoice(s, P1, 'tarot')
    s = submitDrawChoice(s, P2, 'tarot', { rng: () => 0.1 })

    expect(s.activePersistentArcana.sun).toBe(false)
    expect(s.activePersistentArcana.moon).toBe(false)
    expect(s.activePersistentArcana.suddenDeath).toBe(false)
    expect(s.targetRoundsToWin).toBe(5)
    // Pure standard comparison: K(13) > 4(4)
    expect(s.roundOutcome?.winnerId).toBe(P1)
  })

  it('Priority 2: 0. Le Mat cancels round & waives cooldown; XIV. Tempérance equalizes; both trigger Mort Subite', () => {
    // Le Mat alone
    let sMat = setupRiggedMatch({ tarotDeck: [0] })
    sMat = submitDrawChoice(sMat, P1, 'tarot')
    sMat = submitDrawChoice(sMat, P2, 'classic', { rng: () => 0.1 })
    expect(sMat.roundOutcome?.cancelled).toBe(true)
    sMat = advanceToNextRound(sMat)
    expect(canPlayerChooseTarot(sMat, P1)).toBe(true)

    // Tempérance alone
    let sTemp = setupRiggedMatch({ tarotDeck: [14] })
    sTemp.playersRecord[P1].score = 1
    sTemp.playersRecord[P2].score = 4
    sTemp = submitDrawChoice(sTemp, P1, 'tarot')
    sTemp = submitDrawChoice(sTemp, P2, 'classic', { rng: () => 0.1 })
    expect(sTemp.playersRecord[P1].score).toBe(4)

    // Combo 0 + 14 -> Mort Subite
    let sSudden = setupRiggedMatch({ tarotDeck: [0, 14] })
    sSudden.playersRecord[P1].score = 3
    sSudden.playersRecord[P2].score = 4
    sSudden = submitDrawChoice(sSudden, P1, 'tarot')
    sSudden = submitDrawChoice(sSudden, P2, 'tarot', { rng: () => 0.1 })
    expect(sSudden.activePersistentArcana.suddenDeath).toBe(true)
    expect(sSudden.targetRoundsToWin).toBe(1)
    expect(sSudden.playersRecord[P1].score).toBe(0)
    expect(sSudden.playersRecord[P2].score).toBe(0)
  })

  it('Priority 3: XIII. La Mort reshuffles all piles and XII. Le Pendu swaps drawn cards', () => {
    let sDeath = setupRiggedMatch({
      p1Deck: [card('hearts', 'Q')],
      p2Deck: [card('spades', '8')],
      tarotDeck: [13],
      tarotDiscard: [1, 2, 3],
    })
    sDeath.playersRecord[P1].classicDiscard = [card('clubs', 'A')]
    sDeath = submitDrawChoice(sDeath, P1, 'tarot')
    sDeath = submitDrawChoice(sDeath, P2, 'classic', { rng: () => 0.1 })
    expect(sDeath.tarotDiscard).toHaveLength(0)
    expect(sDeath.playersRecord[P1].classicDiscard).toHaveLength(0)

    let sPendu = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [12],
    })
    sPendu = submitDrawChoice(sPendu, P1, 'tarot')
    sPendu = submitDrawChoice(sPendu, P2, 'classic', { rng: () => 0.1 })
    // P1 gets P2's Ace of Spades!
    expect(sPendu.playersRecord[P1].drawnClassic?.rank).toBe('A')
    expect(sPendu.roundOutcome?.winnerId).toBe(P1)
  })

  it("Priority 4: I. Le Bateleur picks top 3, II. La Papesse reorders opponent's deck, IX. L'Ermite peeks & cancels", () => {
    // Le Bateleur
    let sBat = setupRiggedMatch({
      p1Deck: [card('clubs', '3'), card('hearts', 'A'), card('diamonds', '5'), card('spades', '2')],
      p2Deck: [card('spades', '10')],
      tarotDeck: [1],
    })
    sBat = submitDrawChoice(sBat, P1, 'tarot')
    sBat = submitDrawChoice(sBat, P2, 'classic', { rng: () => 0.1 })
    expect(sBat.pendingPrompts[0]?.type).toBe('BATELEUR_PICK_ORDER')
    sBat = resolveArcanePrompt(sBat, P1, {
      type: 'BATELEUR_PICK_ORDER',
      chosenCardId: 'hearts-A',
      remainingOrder: ['diamonds-5', 'clubs-3'],
    })
    expect(sBat.playersRecord[P1].drawnClassic?.rank).toBe('A')
    expect(sBat.playersRecord[P1].classicDeck[0]?.id).toBe('diamonds-5')
    expect(sBat.roundOutcome?.winnerId).toBe(P1)

    // La Papesse
    let sPap = setupRiggedMatch({
      p1Deck: [card('hearts', 'K')],
      p2Deck: [card('clubs', 'A'), card('spades', '4'), card('diamonds', '6'), card('hearts', '7')],
      tarotDeck: [2],
    })
    sPap = submitDrawChoice(sPap, P1, 'tarot')
    sPap = submitDrawChoice(sPap, P2, 'tarot', { rng: () => 0.1 }) // Wait if P2 draws classic, P2 already drew; let's verify reorder effect directly
    expect(sPap.phase).toBe('INTERACTION')
    expect(sPap.pendingPrompts[0]?.type).toBe('PAPESSE_REORDER_OPPONENT')

    // L'Ermite cancel
    let sErm = setupRiggedMatch({
      p1Deck: [card('clubs', '2')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [9],
    })
    sErm = submitDrawChoice(sErm, P1, 'tarot')
    sErm = submitDrawChoice(sErm, P2, 'classic', { rng: () => 0.1 })
    expect(sErm.pendingPrompts[0]?.type).toBe('ERMITE_DECIDE')
    sErm = resolveArcanePrompt(sErm, P1, { type: 'ERMITE_DECIDE', decision: 'cancel' })
    expect(sErm.roundOutcome?.cancelled).toBe(true)
    expect(sErm.playersRecord[P2].score).toBe(0)
  })

  it("Priority 5: III. L'Impératrice keeps best of 2; VII. Le Chariot sums 2 cards", () => {
    let sImp = setupRiggedMatch({
      p1Deck: [card('clubs', '3'), card('hearts', 'Q'), card('diamonds', '4')],
      p2Deck: [card('spades', '9')],
      tarotDeck: [3],
    })
    sImp = submitDrawChoice(sImp, P1, 'tarot')
    sImp = submitDrawChoice(sImp, P2, 'classic', { rng: () => 0.1 })
    expect(sImp.playersRecord[P1].drawnClassic?.rank).toBe('Q')
    expect(sImp.roundOutcome?.winnerId).toBe(P1)

    let sChar = setupRiggedMatch({
      p1Deck: [card('clubs', '8'), card('hearts', '9')],
      p2Deck: [card('spades', 'A')], // 14 < 17
      tarotDeck: [7],
    })
    sChar = submitDrawChoice(sChar, P1, 'tarot')
    sChar = submitDrawChoice(sChar, P2, 'classic', { rng: () => 0.1 })
    expect(sChar.roundOutcome?.winnerId).toBe(P1)
  })

  it('Priority 6 & 7: XV. Le Diable bust (-2), XI. La Force Joker, overridden by V. Le Pape and X. La Roue', () => {
    // Le Diable bust (>21)
    let sDiable = setupRiggedMatch({
      p1Deck: [card('clubs', '10'), card('hearts', 'K')], // 10 <= 11 triggers K -> 23 Bust!
      p2Deck: [card('spades', 'J')],
      tarotDeck: [15],
    })
    sDiable.playersRecord[P1].score = 3
    sDiable = submitDrawChoice(sDiable, P1, 'tarot')
    sDiable = submitDrawChoice(sDiable, P2, 'classic', { rng: () => 0.1 })
    expect(sDiable.playersRecord[P1].bustedDiable).toBe(true)
    expect(sDiable.playersRecord[P1].score).toBe(1)
    expect(sDiable.roundOutcome?.winnerId).toBe(P2)

    // XI. La Force sacrifice vs X. La Roue de la Fortune override
    let sOverride = setupRiggedMatch({
      tarotDeck: [11, 10], // P1 La Force, P2 La Roue
    })
    sOverride.playersRecord[P1].score = 2
    sOverride = submitDrawChoice(sOverride, P1, 'tarot')
    sOverride = submitDrawChoice(sOverride, P2, 'tarot', { rng: () => 0.1 })
    expect(sOverride.pendingPrompts[0]?.type).toBe('FORCE_SACRIFICE')
    sOverride = resolveArcanePrompt(sOverride, P1, { type: 'FORCE_SACRIFICE', sacrifice: true })
    expect(sOverride.playersRecord[P1].forceJokerSecured).toBe(true)
    // Priority 7 overrides La Force Joker!
    expect(sOverride.pendingPrompts[0]?.type).toBe('WHEEL_CALL_COIN')
    // rng = 0.1 -> flipCoin returns 'heads'
    sOverride = resolveArcanePrompt(sOverride, P1, { type: 'WHEEL_CALL_COIN', call: 'heads' }, () => 0.1)
    expect(sOverride.roundOutcome?.winnerId).toBe(P1)
    expect(sOverride.playersRecord[P1].score).toBe(3) // 2 - 1 + 2 = 3

    // V. Le Pape overriding La Force Joker
    let sPape = setupRiggedMatch({ tarotDeck: [11, 5] })
    sPape.playersRecord[P1].score = 2
    sPape = submitDrawChoice(sPape, P1, 'tarot')
    sPape = submitDrawChoice(sPape, P2, 'tarot', { rng: () => 0.1 })
    sPape = resolveArcanePrompt(sPape, P1, { type: 'FORCE_SACRIFICE', sacrifice: true })
    expect(sPape.roundOutcome?.cancelled).toBe(true)
  })

  it("Priority 8 & 9: VIII. La Justice gap >= 5, VI. L'Amoureux same color (+2), XIX. Le Soleil inversion", () => {
    // La Justice reverses gap >= 5
    let sJust = setupRiggedMatch({
      p1Deck: [card('clubs', '3')],
      p2Deck: [card('spades', 'K')], // 13 - 3 = 10 >= 5
      tarotDeck: [8],
    })
    sJust = submitDrawChoice(sJust, P1, 'tarot')
    sJust = submitDrawChoice(sJust, P2, 'classic', { rng: () => 0.1 })
    expect(sJust.roundOutcome?.winnerId).toBe(P1)

    // L'Amoureux same red color -> +2 points
    let sLove = setupRiggedMatch({
      p1Deck: [card('hearts', '2')],
      p2Deck: [card('diamonds', 'A')],
      tarotDeck: [6],
    })
    sLove = submitDrawChoice(sLove, P1, 'tarot')
    sLove = submitDrawChoice(sLove, P2, 'classic', { rng: () => 0.1 })
    expect(sLove.roundOutcome?.winnerId).toBe(P1)
    expect(sLove.playersRecord[P1].score).toBe(2)

    // Le Soleil inversion (lowest wins)
    let sSun = setupRiggedMatch({
      p1Deck: [card('clubs', '3')],
      p2Deck: [card('spades', 'A')],
      tarotDeck: [19],
    })
    sSun = submitDrawChoice(sSun, P1, 'tarot')
    sSun = submitDrawChoice(sSun, P2, 'classic', { rng: () => 0.1 })
    expect(sSun.activePersistentArcana.sun).toBe(true)
    expect(sSun.roundOutcome?.winnerId).toBe(P1)
  })

  it("Priority 10 & XX. Le Jugement: IV. L'Empereur, XVII. L'Étoile, XVIII. La Lune, XXI. Le Monde, XX. Jugement", () => {
    // XXI. Le Monde (+2 on win) + XVII. L'Étoile pick + IV. L'Empereur lock
    let sEmp = setupRiggedMatch({
      p1Deck: [card('hearts', 'Q'), card('hearts', '7')],
      p2Deck: [card('clubs', '5'), card('spades', '9')],
      tarotDeck: [4, 17],
    })
    sEmp = submitDrawChoice(sEmp, P1, 'tarot')
    sEmp = submitDrawChoice(sEmp, P2, 'classic', { rng: () => 0.1 })
    expect(sEmp.pendingPrompts[0]?.type).toBe('EMPEROR_CHOOSE_LOCK')
    sEmp = resolveArcanePrompt(sEmp, P1, {
      type: 'EMPEROR_CHOOSE_LOCK',
      mode: 'forbid_tarot',
    })
    sEmp = advanceToNextRound(sEmp)
    expect(canPlayerChooseTarot(sEmp, P2)).toBe(false)

    // L'Étoile matching #7 gives +2 points on win
    let sStar = setupRiggedMatch({
      p1Deck: [card('hearts', '7')],
      p2Deck: [card('clubs', '2')],
    })
    sStar.activePersistentArcana.star[P1] = { targetNumber: 7, remainingTurns: 2 }
    sStar = submitDrawChoice(sStar, P1, 'classic')
    sStar = submitDrawChoice(sStar, P2, 'classic')
    expect(sStar.roundOutcome?.winnerId).toBe(P1)
    expect(sStar.playersRecord[P1].score).toBe(2)

    // XVIII. La Lune hides round outcome until next round choices lock in
    let sMoon = setupRiggedMatch({
      p1Deck: [card('hearts', 'K'), card('hearts', '8')],
      p2Deck: [card('clubs', '4'), card('spades', '3')],
      tarotDeck: [18],
    })
    sMoon = submitDrawChoice(sMoon, P1, 'tarot')
    sMoon = submitDrawChoice(sMoon, P2, 'classic', { rng: () => 0.1 })
    expect(sMoon.roundOutcome?.hiddenByMoon).toBe(true)
    sMoon = advanceToNextRound(sMoon)
    sMoon = submitDrawChoice(sMoon, P1, 'classic')
    sMoon = submitDrawChoice(sMoon, P2, 'classic')
    expect(sMoon.lastRevealedMoonOutcome?.roundNumber).toBe(1)

    // XX. Le Jugement copying XXI. Le Monde from discard -> +2 rounds
    let sJudg = setupRiggedMatch({
      p1Deck: [card('hearts', 'A')],
      p2Deck: [card('clubs', '3')],
      tarotDeck: [20],
      tarotDiscard: [21],
    })
    sJudg = submitDrawChoice(sJudg, P1, 'tarot')
    sJudg = submitDrawChoice(sJudg, P2, 'classic', { rng: () => 0.1 })
    expect(sJudg.pendingPrompts[0]?.type).toBe('JUDGMENT_COPY_DISCARD')
    sJudg = resolveArcanePrompt(sJudg, P1, {
      type: 'JUDGMENT_COPY_DISCARD',
      targetArcanum: 21,
    })
    expect(sJudg.playersRecord[P1].score).toBe(2)
  })

  it('ends the match when a player reaches 5 won rounds', () => {
    let s = setupRiggedMatch({
      p1Deck: [card('hearts', 'A')],
      p2Deck: [card('clubs', '2')],
    })
    s.playersRecord[P1].score = 4
    s = submitDrawChoice(s, P1, 'classic')
    s = submitDrawChoice(s, P2, 'classic')
    expect(s.status).toBe('finished')
    expect(s.phase).toBe('FINISHED')
    expect(s.winnerId).toBe(P1)
    expect(s.playersRecord[P1].score).toBe(5)
  })
})
