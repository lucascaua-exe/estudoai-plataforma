import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { PLANS, type PlanId } from '@/lib/plans'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

function isPlanId(value: string | null): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'premium'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const access = useAuthStore((s) => s.access)
  const planId = params.get('plano')
  const plan = useMemo(
    () => (isPlanId(planId) ? PLANS.find((p) => p.id === planId) : undefined),
    [planId],
  )

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirm: '',
  })
  const [loading, setLoading] = useState(false)

  if (access) return <Navigate to="/painel" replace />
  if (!plan) return <Navigate to={{ pathname: '/', hash: 'planos' }} replace />

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.password_confirm) {
      toast.error('As senhas não coincidem. Digite novamente.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register/', {
        ...form,
        plan: plan.id,
      })
      setAuth({ user: data.user, access: data.access, refresh: data.refresh })
      toast.success(
        plan.id === 'free'
          ? 'Conta Free criada. Bom estudo.'
          : `Conta criada no plano ${plan.name}. Bem vindo ao painel.`,
      )
      navigate('/painel')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível criar a conta. Tente de novo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-8">
        <p translate="no" className="font-brand text-3xl text-primary">
          EstudoAI
        </p>
        <div className="mt-6 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Plano selecionado
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">
            {plan.name} · {plan.priceLabel}
            {plan.id !== 'free' ? ` ${plan.priceNote}` : ''}
          </p>
          <Link
            to={{ pathname: '/', hash: 'planos' }}
            className="mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Trocar plano
          </Link>
        </div>
        <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Cadastro no plano {plan.name}. Depois você acessa o painel com e-mail e senha.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              value={form.name}
              onChange={onChange}
              placeholder="Seu nome…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={form.email}
              onChange={onChange}
              placeholder="seu@email.com…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={onChange}
              placeholder="Mínimo 8 caracteres…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirm">Confirmar senha</Label>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password_confirm}
              onChange={onChange}
              placeholder="Repita a senha…"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Criando…' : plan.id === 'free' ? 'Criar conta Free' : `Assinar ${plan.name}`}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Entrar
          </Link>
        </p>
      </main>
    </div>
  )
}
