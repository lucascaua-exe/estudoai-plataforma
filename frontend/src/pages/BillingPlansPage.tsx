import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckIcon, ICON_WEIGHT, PlansIcon, ReceiptIcon } from '@/components/ui/icons'
import api from '@/lib/api'
import { PLANS, type PlanId } from '@/lib/plans'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Subscription {
  plano: PlanId
  plano_nome: string
  status: 'active' | 'canceling' | 'canceled'
  periodo_inicio: string | null
  periodo_fim: string | null
  cancelado_em: string | null
  preco_centavos: number
  pode_cancelar: boolean
  pode_reativar: boolean
}

interface InvoiceRow {
  id: number
  number: string
  plan: string
  plan_nome: string
  description: string
  amount_cents: number
  amount_label: string
  status: string
  issued_at: string
  paid_at: string | null
}

interface BillingPayload {
  subscription: Subscription
  invoices: InvoiceRow[]
}

const statusLabel: Record<string, string> = {
  active: 'Ativa',
  canceling: 'Cancelamento agendado',
  canceled: 'Cancelada',
  paid: 'Paga',
  open: 'Em aberto',
  void: 'Anulada',
  refunded: 'Reembolsada',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function BillingPlansPage() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const { data: payload } = await api.get<BillingPayload>('/billing/')
      return payload
    },
  })

  const changePlan = useMutation({
    mutationFn: async (plano: PlanId) => {
      const { data: res } = await api.post('/billing/change-plan/', { plano })
      return res
    },
    onSuccess: async (res) => {
      toast.success(res.message || 'Plano atualizado.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      if (user) {
        setUser({
          ...user,
          plano: res.subscription.plano,
          assinatura_status: res.subscription.status,
        })
      }
      setPendingPlan(null)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível trocar o plano.')),
  })

  const cancelSub = useMutation({
    mutationFn: async (immediate: boolean) => {
      const { data: res } = await api.post('/billing/cancel/', { immediate })
      return res
    },
    onSuccess: async (res) => {
      toast.success(res.message || 'Cancelamento registrado.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      if (user) {
        setUser({
          ...user,
          plano: res.subscription.plano,
          assinatura_status: res.subscription.status,
        })
      }
      setCancelOpen(false)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível cancelar.')),
  })

  const reactivate = useMutation({
    mutationFn: async () => {
      const { data: res } = await api.post('/billing/reactivate/')
      return res
    },
    onSuccess: async (res) => {
      toast.success(res.message || 'Assinatura reativada.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      if (user) {
        setUser({
          ...user,
          plano: res.subscription.plano,
          assinatura_status: res.subscription.status,
        })
      }
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível reativar.')),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const sub = data.subscription
  const current = PLANS.find((p) => p.id === sub.plano)

  return (
    <div>
      <PageHeader
        title="Planos e faturamento"
        description="Veja seu plano atual, troque de assinatura, cancele ou consulte faturas."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PlansIcon className="h-5 w-5" weight={ICON_WEIGHT} aria-hidden />
                Seu plano
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {current?.description || 'Assinatura A Forja'}
              </p>
            </div>
            <Badge variant={sub.status === 'active' ? 'success' : 'secondary'}>
              {statusLabel[sub.status] || sub.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{sub.plano_nome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {sub.preco_centavos === 0
                    ? 'R$ 0'
                    : `R$ ${(sub.preco_centavos / 100).toFixed(2).replace('.', ',')}`}
                  {sub.plano !== 'free' ? (
                    <span className="text-sm font-normal text-muted-foreground"> / mês</span>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período atual</p>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(sub.periodo_inicio)} → {formatDate(sub.periodo_fim)}
                </p>
              </div>
            </div>

            {sub.status === 'canceling' ? (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                Cancelamento agendado para {formatDate(sub.periodo_fim)}. Até lá você mantém os
                benefícios do plano {sub.plano_nome}.
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reactivate.isPending}
                    onClick={() => reactivate.mutate()}
                  >
                    {reactivate.isPending ? 'Reativando…' : 'Manter assinatura'}
                  </Button>
                </div>
              </div>
            ) : null}

            {current ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {current.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" weight={ICON_WEIGHT} aria-hidden />
                    <span className="text-pretty">{f}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {sub.pode_cancelar ? (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  Cancelar assinatura
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Trocar de plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A troca vale a partir de agora. Planos pagos geram uma fatura do ciclo.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === sub.plano && sub.status === 'active'
              return (
                <Card
                  key={plan.id}
                  className={cn(isCurrent && 'border-primary ring-1 ring-primary/30')}
                >
                  <CardContent className="flex h-full flex-col space-y-4 pt-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-semibold">{plan.name}</p>
                      {isCurrent ? <Badge>Atual</Badge> : null}
                      {plan.featured && !isCurrent ? (
                        <Badge variant="secondary">Recomendado</Badge>
                      ) : null}
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {plan.priceLabel}
                      <span className="text-sm font-normal text-muted-foreground">
                        {' '}
                        {plan.priceNote}
                      </span>
                    </p>
                    <p className="text-sm text-pretty text-muted-foreground">{plan.description}</p>
                    <ul className="flex-1 space-y-2">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" weight={ICON_WEIGHT} aria-hidden />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isCurrent ? 'outline' : plan.featured ? 'default' : 'secondary'}
                      disabled={isCurrent || changePlan.isPending}
                      onClick={() => setPendingPlan(plan.id)}
                    >
                      {isCurrent ? 'Plano atual' : `Mudar para ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptIcon className="h-5 w-5" weight={ICON_WEIGHT} aria-hidden />
              Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura emitida ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-3 font-medium">Número</th>
                      <th className="pb-3 font-medium">Descrição</th>
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border/70 last:border-0">
                        <td className="py-3 font-medium tabular-nums">{inv.number}</td>
                        <td className="py-3 text-muted-foreground">{inv.description}</td>
                        <td className="py-3 tabular-nums">{formatDate(inv.issued_at)}</td>
                        <td className="py-3 tabular-nums">{inv.amount_label}</td>
                        <td className="py-3">
                          <Badge variant="secondary">{statusLabel[inv.status] || inv.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar assinatura"
        description="Escolha se prefere manter o acesso até o fim do período pago ou voltar ao Free agora."
      >
        <div className="space-y-3">
          <Button
            className="w-full"
            variant="outline"
            disabled={cancelSub.isPending}
            onClick={() => cancelSub.mutate(false)}
          >
            Cancelar no fim do período
          </Button>
          <Button
            className="w-full"
            variant="destructive"
            disabled={cancelSub.isPending}
            onClick={() => cancelSub.mutate(true)}
          >
            {cancelSub.isPending ? 'Cancelando…' : 'Cancelar agora e ir para Free'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!pendingPlan}
        onOpenChange={(open) => !open && setPendingPlan(null)}
        title={pendingPlan ? `Mudar para ${PLANS.find((p) => p.id === pendingPlan)?.name}` : 'Trocar plano'}
        description={
          pendingPlan === 'free'
            ? 'Você perde os benefícios pagos ao confirmar o downgrade.'
            : 'Uma fatura do novo ciclo será gerada ao confirmar.'
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPendingPlan(null)}>
            Voltar
          </Button>
          <Button
            disabled={!pendingPlan || changePlan.isPending}
            onClick={() => pendingPlan && changePlan.mutate(pendingPlan)}
          >
            {changePlan.isPending ? 'Confirmando…' : 'Confirmar troca'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
