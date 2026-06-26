import { useRef, useState, useCallback, type DragEvent } from 'react'
import { Camera, Trash2, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { validateAvatarFile } from '@/services/profile/profileSchemas'

interface AvatarUploaderProps {
  /** Current avatar URL (from profile) */
  currentUrl: string | null
  /** Username for alt text */
  username: string
  isUploading: boolean
  isRemoving: boolean
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}

/**
 * Avatar upload widget.
 *
 * Features:
 * - Click to open file picker
 * - Drag-and-drop onto the avatar circle
 * - Preview before committing upload
 * - File validation (type + size) with inline error
 * - Upload / Remove action buttons
 */
export function AvatarUploader({
  currentUrl,
  username,
  isUploading,
  isRemoving,
  onUpload,
  onRemove,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const displayUrl = previewUrl ?? currentUrl
  const initials = username.slice(0, 2).toUpperCase()

  // ── File selection ────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setValidationError(null)
    const err = validateAvatarFile(file)
    if (err) {
      setValidationError(err.message)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setPendingFile(file)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!pendingFile) return
    await onUpload(pendingFile)
    setPendingFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleCancel = () => {
    setPendingFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setValidationError(null)
  }

  const handleRemove = async () => {
    await onRemove()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar circle */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag to change avatar"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          // Sizing: 120px mobile, 160px desktop
          'relative size-[120px] sm:size-[160px] rounded-full cursor-pointer',
          'border-2 transition-all duration-200 overflow-hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
          isDragging
            ? 'border-brand-400 scale-105 shadow-lg shadow-brand-500/30'
            : 'border-surface-600 hover:border-brand-500/60',
        )}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-brand-500/20 flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-brand-400">{initials}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className={clsx(
          'absolute inset-0 bg-black/50 flex items-center justify-center',
          'opacity-0 hover:opacity-100 transition-opacity duration-200',
        )}>
          <Camera className="size-6 text-white" aria-hidden="true" />
        </div>

        {/* Preview badge */}
        {previewUrl && (
          <div className="absolute bottom-1 right-1 bg-gold-500 rounded-full size-4 flex items-center justify-center">
            <span className="text-black text-xs font-bold" aria-hidden="true">!</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        aria-label="Upload avatar file"
        onChange={handleFileInputChange}
      />

      {/* Validation error */}
      {validationError && (
        <p role="alert" className="text-xs text-red-400 text-center max-w-[200px]">
          {validationError}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-2">
        {pendingFile ? (
          /* Pending state — show Upload + Cancel */
          <div className="flex gap-2">
            <Button
              id="avatar-upload-confirm"
              size="sm"
              isLoading={isUploading}
              leftIcon={<Upload className="size-3.5" />}
              onClick={handleUpload}
            >
              Upload
            </Button>
            <Button
              id="avatar-upload-cancel"
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        ) : (
          /* Default state */
          <div className="flex gap-2">
            <Button
              id="avatar-change"
              size="sm"
              variant="secondary"
              leftIcon={<Camera className="size-3.5" />}
              onClick={() => fileInputRef.current?.click()}
            >
              {currentUrl ? 'Change' : 'Upload photo'}
            </Button>
            {currentUrl && (
              <Button
                id="avatar-remove"
                size="sm"
                variant="ghost"
                isLoading={isRemoving}
                leftIcon={<Trash2 className="size-3.5" />}
                onClick={handleRemove}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </Button>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500">JPEG, PNG or WebP · max 3 MB</p>
      </div>
    </div>
  )
}
