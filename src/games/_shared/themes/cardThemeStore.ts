import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CARD_BACK_THEMES,
  CARD_BACK_THEME_LIST,
  CARD_FRONT_THEMES,
  CARD_FRONT_THEME_LIST,
  CARD_THEMES,
  CARD_THEME_LIST,
  COIN_THEMES,
  COIN_THEME_LIST,
  DICE_THEMES,
  DICE_THEME_LIST,
  resolveBackTheme,
  resolveCoinTheme,
  resolveDiceTheme,
  resolveFrontTheme,
  type CardBackThemeConfig,
  type CardBackThemeId,
  type CardFrontThemeConfig,
  type CardFrontThemeId,
  type StandardCardFrontThemeId,
  type CardThemeConfig,
  type CardThemeId,
  type CoinThemeConfig,
  type CoinThemeId,
  type DiceThemeConfig,
  type DiceThemeId,
} from './cardThemes'

interface CardThemeState {
  themeId: CardThemeId
  frontThemeId: CardFrontThemeId
  backThemeId: CardBackThemeId
  diceThemeId: DiceThemeId
  coinThemeId: CoinThemeId
  setThemeId: (themeId: CardThemeId) => void
  setFrontThemeId: (frontThemeId: CardFrontThemeId) => void
  setBackThemeId: (backThemeId: CardBackThemeId) => void
  setDiceThemeId: (diceThemeId: DiceThemeId) => void
  setCoinThemeId: (coinThemeId: CoinThemeId) => void
}

export const useCardThemeStore = create<CardThemeState>()(
  persist(
    (set) => ({
      themeId: 'classic',
      frontThemeId: 'classic',
      backThemeId: 'engei-crimson',
      diceThemeId: 'obsidian-gold',
      coinThemeId: 'classic-yen',
      setThemeId: (themeId) => {
        if (themeId in CARD_FRONT_THEMES) {
          const mappedBack: CardBackThemeId =
            themeId === 'midnight-neon'
              ? 'midnight-neon'
              : themeId === 'kinto-pay-to-win'
                ? 'kinto-sovereign-back'
                : themeId === 'royal-fantasy'
                  ? 'bami-gold'
                  : themeId === 'minimalist'
                    ? 'obsidian-minimalist'
                    : 'engei-crimson'
          set({ themeId, frontThemeId: themeId, backThemeId: mappedBack })
        }
      },
      setFrontThemeId: (frontThemeId) => {
        if (frontThemeId in CARD_FRONT_THEMES) {
          set({ frontThemeId, themeId: frontThemeId })
        }
      },
      setBackThemeId: (backThemeId) => {
        if (backThemeId in CARD_BACK_THEMES) {
          set({ backThemeId })
        }
      },
      setDiceThemeId: (diceThemeId) => {
        if (diceThemeId in DICE_THEMES) {
          set({ diceThemeId })
        }
      },
      setCoinThemeId: (coinThemeId) => {
        if (coinThemeId in COIN_THEMES) {
          set({ coinThemeId })
        }
      },
    }),
    {
      name: 'engei-player-card-themes',
    },
  ),
)

export function useCardTheme(): {
  themeId: CardThemeId
  theme: CardThemeConfig
  frontThemeId: CardFrontThemeId
  backThemeId: CardBackThemeId
  diceThemeId: DiceThemeId
  coinThemeId: CoinThemeId
  frontTheme: CardFrontThemeConfig
  backTheme: CardBackThemeConfig
  diceTheme: DiceThemeConfig
  coinTheme: CoinThemeConfig
  setThemeId: (themeId: CardThemeId) => void
  setFrontThemeId: (frontThemeId: CardFrontThemeId) => void
  setBackThemeId: (backThemeId: CardBackThemeId) => void
  setDiceThemeId: (diceThemeId: DiceThemeId) => void
  setCoinThemeId: (coinThemeId: CoinThemeId) => void
  themes: CardThemeConfig[]
  frontThemes: CardFrontThemeConfig[]
  backThemes: CardBackThemeConfig[]
  diceThemes: DiceThemeConfig[]
  coinThemes: CoinThemeConfig[]
} {
  const {
    themeId,
    frontThemeId,
    backThemeId,
    diceThemeId,
    coinThemeId,
    setThemeId,
    setFrontThemeId,
    setBackThemeId,
    setDiceThemeId,
    setCoinThemeId,
  } = useCardThemeStore()

  const frontTheme = resolveFrontTheme(frontThemeId)
  const backTheme = resolveBackTheme(backThemeId)
  const diceTheme = resolveDiceTheme(diceThemeId)
  const coinTheme = resolveCoinTheme(coinThemeId)
  const theme = CARD_THEMES[themeId as StandardCardFrontThemeId] ?? CARD_THEMES.classic

  return {
    themeId,
    theme,
    frontThemeId: frontTheme.id,
    backThemeId: backTheme.id,
    diceThemeId: diceTheme.id,
    coinThemeId: coinTheme.id,
    frontTheme,
    backTheme,
    diceTheme,
    coinTheme,
    setThemeId,
    setFrontThemeId,
    setBackThemeId,
    setDiceThemeId,
    setCoinThemeId,
    themes: CARD_THEME_LIST,
    frontThemes: CARD_FRONT_THEME_LIST,
    backThemes: CARD_BACK_THEME_LIST,
    diceThemes: DICE_THEME_LIST,
    coinThemes: COIN_THEME_LIST,
  }
}
