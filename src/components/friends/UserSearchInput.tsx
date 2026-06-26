import { useEffect, useRef, type ChangeEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'

interface UserSearchInputProps {
  value: string
  onChange: (value: string) => void
  onDebouncedChange: (value: string) => void
  isSearching: boolean
  debounceMs?: number
}

/**
 * Search input with built-in debounce for the Discover tab.
 * Calls `onChange` on every keystroke (controlled input),
 * calls `onDebouncedChange` only after the debounce window.
 */
export function UserSearchInput({
  value,
  onChange,
  onDebouncedChange,
  isSearching,
  debounceMs = 300,
}: UserSearchInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    onChange(next)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onDebouncedChange(next)
    }, debounceMs)
  }

  const handleClear = () => {
    onChange('')
    onDebouncedChange('')
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <Input
      id="user-search"
      type="search"
      placeholder="Search by username…"
      value={value}
      onChange={handleChange}
      autoComplete="off"
      aria-label="Search users by username"
      leftAddon={<Search className="size-4" aria-hidden="true" />}
      rightAddon={
        value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="pointer-events-auto text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isSearching ? (
              <svg
                className="size-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <X className="size-4" />
            )}
          </button>
        ) : null
      }
    />
  )
}
