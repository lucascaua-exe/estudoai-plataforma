import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

/** Unsplash — preparação para prova / estudo (Green Chameleon) */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=80'
const HERO_IMAGE_SRCSET = [
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=75 900w',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80 1400w',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=80 1800w',
].join(', ')

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const access = useAuthStore((s) => s.access)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

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

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
      {/* Mobile: faixa full-bleed no topo */}
      <div className="relative h-40 shrink-0 overflow-hidden sm:h-48 lg:hidden">
        <img
          src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=75"
          width={900}
          height={480}
          alt=""
          role="presentation"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1e3a5f]/35 via-[#1e3a5f]/10 to-background"
          aria-hidden
        />
      </div>

      <main className="relative flex flex-1 flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:px-12 lg:py-16">
        <a href="#login-form" className="skip-link">
          Ir para o formulário de login
        </a>
        <div className="absolute right-4 top-4 z-10 sm:right-6 lg:top-6">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-[22rem] animate-fade-up">
          <p translate="no" className="font-brand text-[2.75rem] text-primary md:text-5xl">
            EstudoAI
          </p>
          <p className="mt-2 text-[0.8125rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Central de Estudos
          </p>

          <h1 className="mt-10 font-serif text-[1.65rem] font-semibold tracking-tight text-foreground md:text-[1.85rem]">
            Entre para continuar estudando
          </h1>
          <p className="mt-2 text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground">
            Sua preparação para Analista de TI — Araguaína/TO 2026.
          </p>

          <form id="login-form" onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
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
                placeholder="seu@email.com…"
                aria-invalid={formError ? true : undefined}
                aria-describedby={formError ? 'login-error' : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha…"
              />
            </div>

            {formError ? (
              <p id="login-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button type="submit" className="mt-2 h-11 w-full text-[0.9375rem]" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </main>

      <aside
        className="relative hidden min-h-dvh overflow-hidden lg:block"
        aria-label="Ambiente de estudo"
      >
        <img
          src={HERO_IMAGE}
          srcSet={HERO_IMAGE_SRCSET}
          sizes="(min-width: 1024px) calc(100vw - 28rem), 100vw"
          width={1800}
          height={1200}
          alt="Estudante escrevendo anotações em caderno durante a preparação para prova"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0f1c2e]/92 via-[#1e3a5f]/40 to-[#1e3a5f]/20"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p className="max-w-lg font-serif text-3xl font-semibold leading-tight text-balance text-white xl:text-4xl">
            Estude com o ritmo de quem vai passar.
          </p>
          <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-[#e8eef5]">
            Banco de questões reais, revisão inteligente e foco no edital da
            Prefeitura de Araguaína.
          </p>
        </div>
      </aside>
    </div>
  )
}
