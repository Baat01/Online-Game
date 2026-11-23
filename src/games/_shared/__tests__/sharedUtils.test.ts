import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {
  alignFaceToCamera,
  buildDieGeometryData,
  computeTargetDieQuaternion,
  computeCoinTargetQuaternion,
} from '../components'
import {
  createSeededRng,
  rollDie,
  rollDice,
  roll2d10,
  combine2d10,
  flipCoin,
  shuffleArray,
} from '../randomUtils'
import {
  getNextTurn,
  getOpponentId,
  isPlayerTurn,
  advanceRound,
  swapPlayerRoles,
} from '../turnHelpers'
import { createStandardDeck, shuffleDeck, drawCards } from '../deck'
import {
  CARD_THEMES,
  CARD_THEME_LIST,
  CARD_FRONT_THEME_LIST,
  CARD_BACK_THEME_LIST,
  DICE_THEME_LIST,
  COIN_THEME_LIST,
  GASTER_TAROT_ARCANUM,
  ALL_UNDERTALE_TAROT_ARCANA,
  UNDERTALE_TAROT_ARCANA,
  UNDERTALE_TAROT_BACK_IMAGE,
  UNDERTALE_TAROT_DECK_META,
  getThemePriceYen,
  getTarotArcanaForCard,
  isThemeUnlocked,
  useCardThemeStore,
} from '../themes'

describe('randomUtils', () => {
  it('createSeededRng is deterministic for string and numeric seeds', () => {
    const rngA = createSeededRng('seed-123')
    const rngB = createSeededRng('seed-123')
    const seqA = Array.from({ length: 5 }, () => rngA())
    const seqB = Array.from({ length: 5 }, () => rngB())
    expect(seqA).toEqual(seqB)

    const numA = createSeededRng(42)
    const numB = createSeededRng(42)
    expect(numA()).toBe(numB())
  })

  it('rollDie and rollDice respect bounds and throw on invalid sides', () => {
    const rng = createSeededRng(99)
    for (let i = 0; i < 40; i++) {
      const r = rollDie(10, rng)
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(10)
    }
    expect(rollDice(6, () => 0)).toBe(1)
    expect(() => rollDie(0)).toThrow()
    expect(() => rollDie(2.5)).toThrow()
  })

  it('roll2d10 and combine2d10 handle 00+0=100 and normal values', () => {
    expect(combine2d10(0, 0)).toBe(100)
    expect(combine2d10(0, 1)).toBe(1)
    expect(combine2d10(4, 7)).toBe(47)
    expect(combine2d10(9, 9)).toBe(99)

    const [tens, units] = roll2d10(() => 0)
    expect(tens).toBe(0)
    expect(units).toBe(0)
  })

  it('flipCoin uses deterministic RNG threshold', () => {
    expect(flipCoin(() => 0.1)).toBe('heads')
    expect(flipCoin(() => 0.9)).toBe('tails')
  })

  it('shuffleArray does not mutate input array', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input, createSeededRng('shuffle'))
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect(result).toHaveLength(5)
    expect(result.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('turnHelpers', () => {
  it('getNextTurn handles empty, null, unknown, and skipCount', () => {
    expect(getNextTurn([], 'p1')).toBe('')
    expect(getNextTurn(['p1', 'p2'], null)).toBe('p1')
    expect(getNextTurn(['p1', 'p2'], 'missing')).toBe('p1')
    expect(getNextTurn(['p1', 'p2'], 'p1')).toBe('p2')
    expect(getNextTurn(['p1', 'p2'], 'p2')).toBe('p1')
    expect(getNextTurn(['p1', 'p2'], 'p1', 1)).toBe('p1')
  })

  it('getOpponentId and isPlayerTurn behave correctly', () => {
    expect(getOpponentId(['p1', 'p2'], 'p1')).toBe('p2')
    expect(getOpponentId(['p1'], 'p1')).toBeNull()
    expect(isPlayerTurn('p1', 'p1')).toBe(true)
    expect(isPlayerTurn('p1', 'p2')).toBe(false)
    expect(isPlayerTurn(null, 'p1')).toBe(false)
  })

  it('advanceRound and swapPlayerRoles update cleanly', () => {
    expect(advanceRound(1, 5)).toEqual({ roundNumber: 2, isMaxReached: false })
    expect(advanceRound(5, 5)).toEqual({ roundNumber: 6, isMaxReached: true })

    const swapped = swapPlayerRoles({
      p1: { role: 'first' as const, wins: 1 },
      p2: { role: 'second' as const, wins: 0 },
      p3: { role: null, wins: 0 },
    })
    expect(swapped.newFirstUserId).toBe('p2')
    expect(swapped.newSecondUserId).toBe('p1')
    expect(swapped.record.p1.role).toBe('second')
    expect(swapped.record.p2.role).toBe('first')
    expect(swapped.record.p3.role).toBeNull()
  })
})

describe('deck & cardThemes', () => {
  it('creates, shuffles deterministically, and draws cards', () => {
    const deck = createStandardDeck()
    expect(deck).toHaveLength(52)

    const shuffled = shuffleDeck(deck, createSeededRng('deck'))
    expect(shuffled).toHaveLength(52)

    const { drawn, remaining } = drawCards(shuffled, 4)
    expect(drawn).toHaveLength(4)
    expect(remaining).toHaveLength(48)
  })

  it('exposes Kinto & standard themes, isolates Undertale Tarot from 52-card fronts, and checks prices/unlocks', () => {
    expect(CARD_THEME_LIST.map((t) => t.id)).toEqual([
      'classic',
      'midnight-neon',
      'royal-fantasy',
      'minimalist',
      'kinto-pay-to-win',
    ])
    expect(CARD_FRONT_THEME_LIST.map((t) => t.id)).not.toContain('undertale-tarot')
    expect(CARD_FRONT_THEME_LIST.map((t) => t.id)).toContain('kinto-pay-to-win')
    expect(CARD_BACK_THEME_LIST.map((t) => t.id)).toContain('kinto-sovereign-back')
    expect(CARD_THEMES['midnight-neon'].name).toBe('Cyber Tokyo')
    expect(DICE_THEME_LIST).toHaveLength(6)
    expect(COIN_THEME_LIST).toHaveLength(6)
    expect(DICE_THEME_LIST.map((d) => d.id)).toContain('kinto-gacha-dice')
    expect(COIN_THEME_LIST.map((c) => c.id)).toContain('kinto-railgun-coin')
    expect(getThemePriceYen('kinto-gacha-dice')).toBe(600)
    expect(getThemePriceYen('kinto-railgun-coin')).toBe(1000)
    expect(getThemePriceYen('undertale-tarot')).toBe(UNDERTALE_TAROT_DECK_META.priceYen)
    expect(UNDERTALE_TAROT_ARCANA).toHaveLength(22)
    expect(UNDERTALE_TAROT_ARCANA[0].name).toBe('Human')
    expect(UNDERTALE_TAROT_ARCANA[0].meaningUpright.length).toBeGreaterThan(10)
    expect(UNDERTALE_TAROT_ARCANA[20].name).toBe('Sans')
    expect(UNDERTALE_TAROT_ARCANA[21].name).toBe('Mt. Ebott')

    const arcana = getTarotArcanaForCard('hearts', 'A')
    expect(arcana.number).toBe(0)
    expect(arcana.imagePath).toBe('/themes/undertale-tarot/0.jpg')

    expect(isThemeUnlocked('classic', true, { is_admin: false, unlocked_themes: [] })).toBe(true)
    expect(isThemeUnlocked('undertale-tarot', false, { is_admin: false, unlocked_themes: [] })).toBe(
      false,
    )
    expect(
      isThemeUnlocked('undertale-tarot', false, {
        is_admin: false,
        unlocked_themes: ['undertale-tarot'],
      }),
    ).toBe(true)
    expect(isThemeUnlocked('undertale-tarot', false, { is_admin: true, unlocked_themes: [] })).toBe(
      true,
    )

    useCardThemeStore.getState().setThemeId('classic')
    expect(useCardThemeStore.getState().themeId).toBe('classic')

    useCardThemeStore.getState().setThemeId('royal-fantasy')
    expect(useCardThemeStore.getState().themeId).toBe('royal-fantasy')

    useCardThemeStore.getState().setDiceThemeId('astral-crystal')
    useCardThemeStore.getState().setCoinThemeId('railgun-coin')
    expect(useCardThemeStore.getState().diceThemeId).toBe('astral-crystal')
    expect(useCardThemeStore.getState().coinThemeId).toBe('railgun-coin')
  })

  it('verifies all 22 Undertale Tarot assets + 666 Gaster + back image exist and validates Three.js 3D dice/coin math', () => {
    const publicDir = path.resolve(process.cwd(), 'public')
    expect(UNDERTALE_TAROT_ARCANA[6].name).toBe('Royal Guards')
    expect(UNDERTALE_TAROT_ARCANA[10].name).toBe('Temmie')
    expect(GASTER_TAROT_ARCANUM.number).toBe(666)
    expect(GASTER_TAROT_ARCANUM.name).toBe('Gaster')
    expect(ALL_UNDERTALE_TAROT_ARCANA).toHaveLength(23)
    expect(fs.existsSync(path.join(publicDir, UNDERTALE_TAROT_BACK_IMAGE))).toBe(true)

    for (const arcanum of ALL_UNDERTALE_TAROT_ARCANA) {
      const absPath = path.join(publicDir, arcanum.imagePath)
      expect(fs.existsSync(absPath)).toBe(true)
      expect(fs.statSync(absPath).size).toBeGreaterThan(20000)
    }

    const expectedFaceCounts = {
      d4: 4,
      d6: 6,
      d8: 8,
      d10: 10,
      'd10-tens': 10,
      d12: 12,
      d16: 16,
      d20: 20,
    } as const

    const zForward = new THREE.Vector3(0, 0, 1)
    const yUp = new THREE.Vector3(0, 1, 0)
    for (const dieType of ['d4', 'd6', 'd8', 'd10', 'd10-tens', 'd12', 'd16', 'd20'] as const) {
      const { geometry, faces } = buildDieGeometryData(dieType)
      expect(faces).toHaveLength(expectedFaceCounts[dieType])
      for (const f of faces) {
        const q = computeTargetDieQuaternion(dieType, f.value)
        const qExact = alignFaceToCamera(f.normal, f.up)
        expect(q.angleTo(qExact)).toBeLessThan(1e-4)

        const alignedNormal = f.normal.clone().applyQuaternion(q)
        const alignedUp = f.up.clone().applyQuaternion(q)
        expect(alignedNormal.distanceTo(zForward)).toBeLessThan(1e-4)
        expect(alignedUp.distanceTo(yUp)).toBeLessThan(1e-4)
      }

      // Verify distortion-free bounded [0.04, 0.96] UV coordinates on d10, d10-tens, and d16
      if (dieType === 'd10' || dieType === 'd10-tens' || dieType === 'd16') {
        const uvAttr = geometry.getAttribute('uv')
        expect(uvAttr.count).toBeGreaterThan(0)
        for (let idx = 0; idx < uvAttr.count; idx++) {
          const u = uvAttr.getX(idx)
          const v = uvAttr.getY(idx)
          expect(u).toBeGreaterThanOrEqual(0.039)
          expect(u).toBeLessThanOrEqual(0.961)
          expect(v).toBeGreaterThanOrEqual(0.039)
          expect(v).toBeLessThanOrEqual(0.961)
        }
      }
      geometry.dispose()
    }

    const qHeads = computeCoinTargetQuaternion('heads')
    const qTails = computeCoinTargetQuaternion('tails')
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(qHeads).distanceTo(zForward)).toBeLessThan(1e-4)
    expect(new THREE.Vector3(0, -1, 0).applyQuaternion(qTails).distanceTo(zForward)).toBeLessThan(1e-4)
  })
})

describe('shared store reset check', () => {
  beforeEach(() => {
    useCardThemeStore.getState().setThemeId('classic')
  })

  it('resets back to classic', () => {
    expect(useCardThemeStore.getState().themeId).toBe('classic')
  })
})
