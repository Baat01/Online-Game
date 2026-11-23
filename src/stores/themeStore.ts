import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export function applyThemeToDom(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

/**
 * Zustand store for managing Mode Nuit (dark) / Mode Jour (light).
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
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyThemeToDom(next)
      },
    }),
    {
      name: 'engei-ui-theme',
      onRehydrateStorage: () => (state) => {
        applyThemeToDom(state?.theme ?? 'dark')
      },
    },
  ),
)

// Ensure DOM reflects default theme on initial module evaluation
if (typeof document !== 'undefined') {
  applyThemeToDom(useThemeStore.getState().theme)
}
