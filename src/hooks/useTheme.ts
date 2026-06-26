import { useThemeStore } from '@/stores/themeStore'

/**
 * Convenience hook for reading and toggling the current theme.
 *
 * Usage:
 *   const { theme, toggleTheme, isDark } = useTheme()
 */
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore()
  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  }
}
