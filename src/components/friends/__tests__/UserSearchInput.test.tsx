import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserSearchInput } from '../UserSearchInput'

describe('UserSearchInput', () => {
  const setup = (overrides: Partial<React.ComponentProps<typeof UserSearchInput>> = {}) => {
    const onChange = vi.fn()
    const onDebouncedChange = vi.fn()

    render(
      <UserSearchInput
        value=""
        onChange={onChange}
        onDebouncedChange={onDebouncedChange}
        isSearching={false}
        debounceMs={0} // instant debounce for tests
        {...overrides}
      />,
    )

    return { onChange, onDebouncedChange }
  }

  it('renders an input with search label', () => {
    setup()
    expect(screen.getByRole('searchbox', { name: /search users/i })).toBeInTheDocument()
  })

  it('calls onChange on every keystroke', async () => {
    const { onChange } = setup()
    const input = screen.getByRole('searchbox')

    await userEvent.type(input, 'ali')

    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('calls onDebouncedChange after debounce window', async () => {
    const { onDebouncedChange } = setup()
    const input = screen.getByRole('searchbox')

    fireEvent.change(input, { target: { value: 'alice' } })

    await waitFor(() => {
      expect(onDebouncedChange).toHaveBeenCalledWith('alice')
    })
  })

  it('shows clear button when value is non-empty', () => {
    setup({ value: 'test' })
    expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument()
  })

  it('does not show clear button when value is empty', () => {
    setup({ value: '' })
    expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument()
  })

  it('calls onChange and onDebouncedChange with empty string on clear', async () => {
    const { onChange, onDebouncedChange } = setup({ value: 'test' })

    await userEvent.click(screen.getByLabelText(/clear search/i))

    expect(onChange).toHaveBeenCalledWith('')
    await waitFor(() => {
      expect(onDebouncedChange).toHaveBeenCalledWith('')
    })
  })

  it('shows spinner when isSearching=true and value is non-empty', () => {
    setup({ value: 'ali', isSearching: true })
    // Spinner is an SVG — check the clear button is replaced by it
    // The clear button aria-label still exists (wraps spinner)
    expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument()
    // The spinner SVG should be present
    expect(document.querySelector('svg.animate-spin')).toBeTruthy()
  })
})
