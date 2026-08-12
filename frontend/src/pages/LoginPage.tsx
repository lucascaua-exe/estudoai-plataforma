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

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=80'
const HERO_IMAGE_SRCSET = [
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=75 900w',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80 1400w',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=80 1800w',
].join(', ')

const fieldClass =
  'h-12 border-border/80 bg-card shadow-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-primary/20'

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
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-background lg:grid lg:h-auto lg:max-h-none lg:min-h-dvh lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)] lg:overflow-visible">
      {/* Mobile: faixa superior da imagem (ocupa parte da tela) */}
      <div className="relative h-[22dvh] min-h-[7rem] max-h-[11rem] shrink-0 overflow-hidden lg:hidden">
        <img
          src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=75"
          width={900}
          height={360}
          alt=""
          role="presentation"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-foreground/20 via-transparent to-background"
          aria-hidden
        />
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 lg:min-h-dvh lg:justify-center lg:px-12 lg:py-16 lg:pb-16">
        <a href="#login-form" className="skip-link">
          Ir para o formulário de login
        </a>

        <div className="relative mx-auto flex h-full w-full max-w-[22rem] min-h-0 flex-1 flex-col lg:h-auto lg:flex-none">
          <div className="absolute right-0 top-0 z-10">
            <ThemeToggle />
          </div>

          <header className="shrink-0 px-8 pt-1 text-center">
            <p
              translate="no"
              className="font-brand text-[2.75rem] leading-[0.95] text-primary sm:text-[3.1rem]"
            >
              EstudoAI
            </p>
            <p className="mx-auto mt-2.5 max-w-[18ch] text-pretty text-[0.95rem] font-medium leading-snug tracking-tight text-foreground/80">
              Estude com o ritmo de quem vai passar.
            </p>
          </header>

          {/* Meio: formulário ocupa o espaço restante e centraliza nele */}
          <div className="flex min-h-0 flex-1 flex-col justify-center py-3 lg:flex-none lg:py-0">
            <div className="animate-fade-up">
              <h1 className="text-center font-display text-[1.35rem] font-semibold tracking-tight text-foreground sm:text-[1.45rem]">
                Bem-vindo de volta
              </h1>
              <p className="mt-1 text-center text-pretty text-[0.9rem] leading-relaxed text-muted-foreground">
                Entre para continuar sua preparação.
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
                    className="rounded-xl bg-destructive/8 px-3 py-2 text-sm text-destructive"
                  >
                    {formError}
                  </p>
                ) : null}

                <Button type="submit" size="lg" className="mt-0.5 h-12 w-full" disabled={loading}>
                  {loading ? 'Entrando…' : 'Entrar'}
                </Button>
              </form>
            </div>
          </div>

          {/* Base: colado no fim da tela (sem faixa vazia abaixo) */}
          <p className="shrink-0 pt-2 pb-1 text-center text-sm text-muted-foreground lg:mt-8 lg:pt-0">
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
          sizes="(min-width: 1024px) calc(100vw - 26rem), 100vw"
          width={1800}
          height={1200}
          alt="Estudante escrevendo anotações em caderno durante a preparação para prova"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#1c1917]/88 via-[#1c1917]/35 to-[#1c1917]/10"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p className="max-w-md font-display text-3xl font-semibold leading-tight text-balance text-white xl:text-[2.15rem]">
            Estude com o ritmo de quem vai passar.
          </p>
          <p className="mt-3 max-w-sm text-pretty text-[0.95rem] leading-relaxed text-white/80">
            Banco oficial e revisão inteligente para Analista de TI — Araguaína.
          </p>
        </div>
      </aside>
    </div>
  )
}
