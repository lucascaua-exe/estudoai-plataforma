import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginHeroCarousel } from '@/components/auth/LoginHeroCarousel'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'

const fieldClass =
  'h-12 rounded-2xl border-border/70 bg-secondary/40 shadow-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/65 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-primary/20'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const access = useAuthStore((s) => s.access)
  const reducedMotion = useReducedMotionPreference()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    setHydrated(useAuthStore.persist.hasHydrated())
    return unsub
  }, [])

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="mx-auto h-16 w-36 rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (access) return <Navigate to="/painel" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      setAuth({ user: data.user, access: data.access, refresh: data.refresh })
      toast.success('Bem-vindo de volta!')
      navigate('/painel')
    } catch (err) {
      const message = getErrorMessage(err, 'Falha no login. Verifique e-mail e senha.')
      setFormError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const enter = reducedMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.45 } }
  const initial = reducedMotion ? false : { opacity: 0, y: 12 }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-background lg:grid lg:h-auto lg:max-h-none lg:min-h-dvh lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:overflow-visible">
      <a href="#login-form" className="skip-link">
        Ir para o formulário de login
      </a>

      {/* Mobile: faixa visual discreta */}
      <div className="relative h-[20dvh] min-h-[6.5rem] max-h-[9.5rem] shrink-0 overflow-hidden lg:hidden">
        <LoginHeroCarousel variant="compact" />
      </div>

      {/* Coluna de autenticação — logo + formulário (padrão familiar) */}
      <main className="relative flex min-h-0 flex-1 flex-col px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 lg:min-h-dvh lg:justify-center lg:px-12 lg:py-16">
        <div className="absolute top-3 right-4 z-10 sm:top-5 sm:right-6 lg:top-8 lg:right-8">
          <ThemeToggle />
        </div>

        <motion.div
          className="mx-auto flex w-full max-w-[22rem] min-h-0 flex-1 flex-col lg:flex-none"
          initial={initial}
          animate={enter}
        >
          <header className="shrink-0 text-center">
            <BrandLogo
              size="lg"
              className="mx-auto h-[7.5rem] max-w-[13.5rem] sm:h-36 sm:max-w-[15rem]"
            />
          </header>

          <div className="mt-7 flex min-h-0 flex-1 flex-col justify-center lg:mt-9 lg:flex-none">
            <h1 className="text-center font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.55rem]">
              Bem-vindo de volta
            </h1>
            <p className="mt-1.5 text-center text-[0.95rem] leading-relaxed tracking-[-0.01em] text-muted-foreground">
              Entre para continuar sua preparação.
            </p>

            <form id="login-form" onSubmit={onSubmit} className="mt-6 space-y-3.5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={fieldClass}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? 'login-error' : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-muted-foreground">
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClass}
                />
              </div>

              {formError ? (
                <p
                  id="login-error"
                  role="alert"
                  aria-live="polite"
                  className="rounded-2xl bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
                >
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="mt-1 h-12 w-full cursor-pointer rounded-2xl active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-100"
                disabled={loading}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </div>

          <p className="shrink-0 pt-5 pb-1 text-center text-sm tracking-[-0.01em] text-muted-foreground lg:mt-8 lg:pt-0">
            Ainda não tem conta?{' '}
            <Link
              to="/register"
              className="cursor-pointer font-semibold text-primary underline-offset-4 transition-opacity hover:underline active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Criar conta
            </Link>
          </p>
        </motion.div>
      </main>

      {/* Desktop: carrossel full-bleed, sem card flutuante por cima */}
      <aside
        className="relative hidden min-h-dvh overflow-hidden lg:block"
        aria-label="Ambiente de estudo"
      >
        <LoginHeroCarousel variant="full" />
      </aside>
    </div>
  )
}
