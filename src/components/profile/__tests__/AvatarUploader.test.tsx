import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvatarUploader } from '../AvatarUploader'

/**
 * AvatarUploader component tests.
 * Tests file validation, preview, and action callbacks.
 */

const mockOnUpload = vi.fn()
const mockOnRemove = vi.fn()

function renderUploader(props: Partial<React.ComponentProps<typeof AvatarUploader>> = {}) {
  return render(
    <AvatarUploader
      currentUrl={null}
      username="testuser"
      isUploading={false}
      isRemoving={false}
      onUpload={mockOnUpload}
      onRemove={mockOnRemove}
      {...props}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // URL.createObjectURL isn't available in jsdom
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

// ─────────────────────────────────────────────────────────────────────────────

describe('AvatarUploader', () => {
  it('renders avatar circle and upload button', () => {
    renderUploader()
    expect(screen.getByRole('button', { name: /click or drag/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument()
  })

  it('shows initials when no avatar URL', () => {
    renderUploader({ username: 'testuser' })
    // First 2 chars uppercased
    expect(screen.getByText('TE')).toBeInTheDocument()
  })

  it('renders avatar image when URL is provided', () => {
    renderUploader({ currentUrl: 'https://example.com/avatar.webp' })
    expect(screen.getByRole('img', { name: /testuser's avatar/i })).toBeInTheDocument()
  })

  it('shows Remove button when avatar URL exists', () => {
    renderUploader({ currentUrl: 'https://example.com/avatar.webp' })
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('calls onRemove when Remove is clicked', async () => {
    mockOnRemove.mockResolvedValue(undefined)
    renderUploader({ currentUrl: 'https://example.com/avatar.webp' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /remove/i }))
    expect(mockOnRemove).toHaveBeenCalledTimes(1)
  })

  it('rejects files larger than 3MB with an error message', async () => {
    renderUploader()

    const bigFile = new File(['x'.repeat(4 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 4 * 1024 * 1024 })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [bigFile] } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/too large/i)
    })

    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('rejects invalid MIME types with an error message', async () => {
    renderUploader()

    const badFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [badFile] } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/jpeg, png/i)
    })
  })

  it('shows preview and Upload/Cancel buttons for a valid file', async () => {
    renderUploader()

    const validFile = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [validFile] } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^upload$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('calls onUpload with the file when Upload is confirmed', async () => {
    mockOnUpload.mockResolvedValue(undefined)
    renderUploader()
    const user = userEvent.setup()

    const validFile = new File(['img'], 'avatar.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [validFile] } })

    await waitFor(() => screen.getByRole('button', { name: /^upload$/i }))

    await user.click(screen.getByRole('button', { name: /^upload$/i }))

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(validFile)
    })
  })

  it('cancels preview and reverts to original state on Cancel', async () => {
    renderUploader()
    const user = userEvent.setup()

    const validFile = new File(['img'], 'avatar.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [validFile] } })

    await waitFor(() => screen.getByRole('button', { name: /cancel/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^upload$/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument()
    })

    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
  })
})
