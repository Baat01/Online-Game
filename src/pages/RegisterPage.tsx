import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { FormField } from '@/components/auth/FormField'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema, type RegisterFormValues } from '@/services/auth/authSchemas'

/**
 * Register page — username, email, password, confirm password.
 * Calls register() from AuthContext on submit.
 */
export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null)
    try {
      await registerUser(values.email, values.password, values.username)
      navigate('/', { replace: true })
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.',
      )
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join CardArena — it's free"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <form
        id="register-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* API-level error */}
        {apiError && (
          <div
            role="alert"
            className="px-3 py-2 rounded-btn bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            {apiError}
          </div>
        )}

        <FormField
          id="register-username"
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="ace_player"
          leftAddon={<User className="size-4" />}
          error={errors.username}
          hint="3–20 characters, letters, numbers, underscores"
          {...register('username')}
        />

        <FormField
          id="register-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leftAddon={<Mail className="size-4" />}
          error={errors.email}
          {...register('email')}
        />

        <FormField
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          leftAddon={<Lock className="size-4" />}
          error={errors.password}
          hint="Minimum 6 characters"
          {...register('password')}
        />

        <FormField
          id="register-confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          leftAddon={<Lock className="size-4" />}
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        <Button
          id="register-submit"
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          By creating an account, you agree to our Terms of Service.
        </p>
      </form>
    </AuthCard>
  )
}
