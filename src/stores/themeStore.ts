import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * Zustand store for managing the UI theme.
 * Persisted to localStorage so preference survives refreshes.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',

      setTheme: (theme) => {
        set({ theme })
        applyThemeToDom(theme)
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyThemeToDom(next)
      },
    }),
    {
      name: 'card-arena-theme',
      onRehydrateStorage: () => (state) => {
        // Apply persisted theme to DOM on app load
        if (state) applyThemeToDom(state.theme)
      },
    },
  ),
)

function applyThemeToDom(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}
