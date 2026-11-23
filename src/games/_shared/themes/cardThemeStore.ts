import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CARD_BACK_THEMES,
  CARD_BACK_THEME_LIST,
  CARD_FRONT_THEMES,
  CARD_FRONT_THEME_LIST,
  CARD_THEMES,
  CARD_THEME_LIST,
  resolveBackTheme,
  resolveFrontTheme,
  type CardBackThemeConfig,
  type CardBackThemeId,
  type CardFrontThemeConfig,
  type CardFrontThemeId,
  type CardThemeConfig,
  type CardThemeId,
} from './cardThemes'

interface CardThemeState {
  themeId: CardThemeId
  frontThemeId: CardFrontThemeId
  backThemeId: CardBackThemeId
  setThemeId: (themeId: CardThemeId) => void
  setFrontThemeId: (frontThemeId: CardFrontThemeId) => void
  setBackThemeId: (backThemeId: CardBackThemeId) => void
}

export const useCardThemeStore = create<CardThemeState>()(
  persist(
    (set) => ({
      themeId: 'classic',
      frontThemeId: 'classic',
      backThemeId: 'engei-crimson',
      setThemeId: (themeId) => {
        if (themeId in CARD_FRONT_THEMES) {
          const mappedBack: CardBackThemeId =
            themeId === 'midnight-neon'
              ? 'midnight-neon'
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
  frontTheme: CardFrontThemeConfig
  backTheme: CardBackThemeConfig
  setThemeId: (themeId: CardThemeId) => void
  setFrontThemeId: (frontThemeId: CardFrontThemeId) => void
  setBackThemeId: (backThemeId: CardBackThemeId) => void
  themes: CardThemeConfig[]
  frontThemes: CardFrontThemeConfig[]
  backThemes: CardBackThemeConfig[]
} {
  const {
    themeId,
    frontThemeId,
    backThemeId,
    setThemeId,
    setFrontThemeId,
    setBackThemeId,
  } = useCardThemeStore()

  const frontTheme = resolveFrontTheme(frontThemeId)
  const backTheme = resolveBackTheme(backThemeId)
  const theme = CARD_THEMES[themeId] ?? CARD_THEMES.classic

  return {
    themeId,
    theme,
    frontThemeId: frontTheme.id,
    backThemeId: backTheme.id,
    frontTheme,
    backTheme,
    setThemeId,
    setFrontThemeId,
    setBackThemeId,
    themes: CARD_THEME_LIST,
    frontThemes: CARD_FRONT_THEME_LIST,
    backThemes: CARD_BACK_THEME_LIST,
  }
}
