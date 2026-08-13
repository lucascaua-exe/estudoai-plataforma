import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { cn, getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginHeroCarousel } from '@/components/auth/LoginHeroCarousel'

const fieldClass =
  'h-12 border-border/80 bg-background/90 shadow-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-primary/20'

function LoginForm({
  className,
  email,
  password,
  loading,
  formError,
  onEmail,
  onPassword,
  onSubmit,
}: {
  className?: string
  email: string
  password: string
  loading: boolean
  formError: string
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className={cn('w-full', className)}>
      <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Entrar
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Continue sua preparação na Forja.
      </p>

      <form id="login-form" onSubmit={onSubmit} className="mt-5 space-y-3.5" noValidate>
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
            onChange={(e) => onEmail(e.target.value)}
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
            onChange={(e) => onPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>

        {formError ? (
          <p
            id="login-error"
            role="alert"
            aria-live="polite"
            className="rounded-xl bg-destructive/8 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="h-12 w-full cursor-pointer" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link
          to="/register"
          className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Criar conta
        </Link>
      </p>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const access = useAuthStore((s) => s.access)
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
          <Skeleton className="mx-auto h-24 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
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

  const formProps = {
    email,
    password,
    loading,
    formError,
    onEmail: setEmail,
    onPassword: setPassword,
    onSubmit,
  }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-background lg:grid lg:h-auto lg:max-h-none lg:min-h-dvh lg:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] lg:overflow-visible">
      <a href="#login-form" className="skip-link">
        Ir para o formulário de login
      </a>

      {/* Mobile: carrossel no topo */}
      <div className="relative h-[26dvh] min-h-[8.5rem] max-h-[12rem] shrink-0 overflow-hidden lg:hidden">
        <LoginHeroCarousel variant="compact" />
      </div>

      {/* Painel da marca — só a logo, centralizada */}
      <aside className="relative flex min-h-0 flex-1 flex-col lg:min-h-dvh">
        <div className="absolute top-3 right-4 z-10 sm:top-5 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-6 sm:px-10 lg:px-12">
          <BrandLogo
            size="hero"
            className="mx-auto h-44 max-w-[15rem] sm:h-52 sm:max-w-[17rem] lg:h-60 lg:max-w-[19rem]"
          />
          <p className="sr-only">A Forja — A disciplina que molda o seu nome</p>
        </div>

        {/* Mobile: formulário abaixo da logo */}
        <div className="shrink-0 border-t border-border/70 bg-card/80 px-6 py-5 backdrop-blur-md sm:px-10 lg:hidden">
          <LoginForm {...formProps} className="mx-auto max-w-[22rem]" />
        </div>
      </aside>

      {/* Desktop: carrossel + card de login em glass */}
      <section
        className="relative hidden min-h-dvh overflow-hidden lg:block"
        aria-label="Ambiente de estudo"
      >
        <LoginHeroCarousel variant="full" className="absolute inset-0" />

        <div className="absolute inset-0 z-10 flex items-center justify-end p-8 xl:p-12">
          <div
            className={cn(
              'w-full max-w-[24rem] rounded-3xl border border-white/25 bg-card/92 p-7 shadow-[0_24px_64px_-24px_rgba(11,20,36,0.55)] backdrop-blur-xl',
              'dark:border-white/15 dark:bg-[#0B1424]/78',
              'motion-safe:animate-fade-up',
            )}
          >
            <LoginForm {...formProps} />
          </div>
        </div>
      </section>
    </div>
  )
}
