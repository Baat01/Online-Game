import type { ReactNode } from 'react'
import type { FieldError } from 'react-hook-form'
import { Input } from '@/components/ui/Input'

interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label: string
  /** react-hook-form FieldError (contains message) */
  error?: FieldError
  /** Optional icon on the left side of the input */
  leftAddon?: ReactNode
  /** Optional icon on the right side of the input */
  rightAddon?: ReactNode
  /** Optional hint text shown below the field */
  hint?: string
}

/**
 * Thin wrapper that bridges react-hook-form's `register()` output with our Input component.
 *
 * Usage:
 *   <FormField
 *     label="Email"
 *     type="email"
 *     error={errors.email}
 *     {...register('email')}
 *   />
 */
export function FormField({ label, error, leftAddon, rightAddon, hint, ...inputProps }: FormFieldProps) {
  return (
    <Input
      label={label}
      error={error?.message}
      leftAddon={leftAddon}
      rightAddon={rightAddon}
      hint={hint}
      {...inputProps}
    />
  )
}
