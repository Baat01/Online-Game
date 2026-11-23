import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { FormField } from '@/components/auth/FormField'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema, type LoginFormValues } from '@/services/auth/authSchemas'
import { supabase } from '@/lib/supabase'
import { listDemoAccounts, switchActiveDemoAccount } from '@/lib/localSupabase'

/**
 * Login page — email + password form.
 * Calls login() from AuthContext, handles errors inline.
 * On success, navigate() to home (onAuthStateChange fires automatically).
 */
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState<string | null>(null)
  const isLocalDemo = Boolean((supabase as unknown as { __isLocalDemo?: boolean }).__isLocalDemo)
  const demoAccounts = isLocalDemo ? listDemoAccounts() : []

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null)
    try {
      await login(values.email, values.password)
      navigate('/', { replace: true })
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your ENGEI — Cercle Bami account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-brand-400 hover:text-brand-300">
            Create one free
          </Link>
        </>
      }
    >
      <form
        id="login-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* API-level error banner */}
        {apiError && (
          <div
            role="alert"
            className="px-3 py-2 rounded-btn bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            {apiError}
          </div>
        )}

        <FormField
          id="login-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leftAddon={<Mail className="size-4" />}
          error={errors.email}
          {...register('email')}
        />

        <FormField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          leftAddon={<Lock className="size-4" />}
          error={errors.password}
          {...register('password')}
        />

        <Button
          id="login-submit"
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        {isLocalDemo && demoAccounts.length > 0 && (
          <div className="pt-3 border-t border-surface-700 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
              Comptes locaux ENGEI (Connexion rapide)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {demoAccounts.map((acc) => (
                <Button
                  key={acc.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    switchActiveDemoAccount(acc.id)
                    navigate('/', { replace: true })
                  }}
                >
                  {acc.display_name ?? acc.username}
                </Button>
              ))}
            </div>
          </div>
        )}
      </form>
    </AuthCard>
  )
}
