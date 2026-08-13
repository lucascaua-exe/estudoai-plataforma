import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEvolution } from '@/hooks/use-api'
import { formatPercent } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { FadeIn } from '@/components/motion/FadeIn'

const STROKE = '#2563EB'
const BAR = '#0F766E'

export function EvolutionPage() {
  const [periodo, setPeriodo] = useState(30)
  const { data, isLoading, isError, refetch } = useEvolution(periodo)

  const chartData =
    data?.evolucao_diaria.map((d) => ({
      ...d,
      label: format(parseISO(d.data), 'dd/MM', { locale: ptBR }),
    })) || []

  return (
    <FadeIn>
      <PageHeader
        title="Evolução"
        description="Acompanhe a curva de acertos ao longo do tempo."
        actions={
          <div className="flex gap-2" role="group" aria-label="Período">
            {[7, 30, 90].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={periodo === p ? 'default' : 'outline'}
                aria-pressed={periodo === p}
                onClick={() => setPeriodo(p)}
              >
                {p}d
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !chartData.length ? (
        <EmptyState
          title="Sem evolução registrada"
          description="Comece a responder questões para ver sua curva de progresso."
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Percentual diário de acerto</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="acerto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STROKE} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={STROKE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) => formatPercent(Number(value), 1)}
                        labelFormatter={(_, payload) => {
                          const raw = payload?.[0]?.payload?.data
                          return typeof raw === 'string'
                            ? format(parseISO(raw), "dd 'de' MMMM", { locale: ptBR })
                            : ''
                        }}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="percentual"
                    name="Acerto"
                    stroke={STROKE}
                    fill="url(#acerto)"
                    strokeWidth={2.5}
                    animationDuration={900}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por disciplina</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.por_disciplina || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(value) => formatPercent(Number(value), 1)} />
                    }
                  />
                  <Bar
                    dataKey="percentual"
                    name="Aproveitamento"
                    fill={BAR}
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </FadeIn>
  )
}
