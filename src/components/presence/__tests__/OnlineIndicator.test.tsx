import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnlineIndicator } from '../OnlineIndicator'

describe('OnlineIndicator', () => {
  it('renders with aria-label "Online" when online', () => {
    render(<OnlineIndicator isOnline={true} />)
    expect(screen.getByRole('img', { name: /online/i })).toBeInTheDocument()
  })

  it('renders with aria-label "Offline" when offline', () => {
    render(<OnlineIndicator isOnline={false} />)
    expect(screen.getByRole('img', { name: /offline/i })).toBeInTheDocument()
  })

  it('applies animate-pulse-glow when online', () => {
    const { container } = render(<OnlineIndicator isOnline={true} />)
    expect(container.firstChild).toHaveClass('animate-pulse-glow')
  })

  it('does not apply animate-pulse-glow when offline', () => {
    const { container } = render(<OnlineIndicator isOnline={false} />)
    expect(container.firstChild).not.toHaveClass('animate-pulse-glow')
  })

  it('renders with sm size class', () => {
    const { container } = render(<OnlineIndicator isOnline={true} size="sm" />)
    expect(container.firstChild).toHaveClass('size-2')
  })

  it('renders with md size class by default', () => {
    const { container } = render(<OnlineIndicator isOnline={true} />)
    expect(container.firstChild).toHaveClass('size-2.5')
  })
})
