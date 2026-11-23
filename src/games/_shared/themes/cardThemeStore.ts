import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CARD_THEMES,
  CARD_THEME_LIST,
  type CardThemeConfig,
  type CardThemeId,
} from './cardThemes'

interface CardThemeState {
  themeId: CardThemeId
  setThemeId: (themeId: CardThemeId) => void
}

export const useCardThemeStore = create<CardThemeState>()(
  persist(
    (set) => ({
      themeId: 'classic',
      setThemeId: (themeId) => {
        if (themeId in CARD_THEMES) {
          set({ themeId })
        }
      },
    }),
    {
      name: 'card-arena-deck-theme',
    },
  ),
)

export function useCardTheme(): {
  themeId: CardThemeId
  theme: CardThemeConfig
  setThemeId: (themeId: CardThemeId) => void
  themes: CardThemeConfig[]
} {
  const { themeId, setThemeId } = useCardThemeStore()
  const theme = CARD_THEMES[themeId] ?? CARD_THEMES.classic
  return {
    themeId,
    theme,
    setThemeId,
    themes: CARD_THEME_LIST,
  }
}
