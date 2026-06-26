import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}

/**
 * Styled form input with label, error, hint, and icon-addon support.
 * Uses React's useId for accessible label association.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const id = externalId ?? generatedId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftAddon && (
            <span className="absolute left-3 text-slate-400 pointer-events-none">{leftAddon}</span>
          )}

          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={clsx(
              // Base
              'w-full h-10 rounded-btn bg-surface-700 border',
              'text-sm text-slate-100 placeholder:text-slate-500',
              'transition-colors duration-150',
              // Padding — adjust for addons
              leftAddon ? 'pl-9 pr-3' : 'px-3',
              rightAddon ? 'pr-9' : '',
              // State
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-surface-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            )}
            {...props}
          />

          {rightAddon && (
            <span className="absolute right-3 text-slate-400 pointer-events-none">{rightAddon}</span>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
