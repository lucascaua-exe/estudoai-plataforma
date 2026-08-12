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

export function EvolutionPage() {
  const [periodo, setPeriodo] = useState(30)
  const { data, isLoading, isError, refetch } = useEvolution(periodo)

  const chartData =
    data?.evolucao_diaria.map((d) => ({
      ...d,
      label: format(parseISO(d.data), 'dd/MM', { locale: ptBR }),
    })) || []

  return (
    <div>
      <PageHeader
        title="Evolução"
        description="Acompanhe a curva de acertos ao longo do tempo."
        actions={
          <div className="flex gap-2">
            {[7, 30, 90].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={periodo === p ? 'default' : 'outline'}
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
                      <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatPercent(Number(value), 1)}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.data
                        ? format(parseISO(payload[0].payload.data), "dd 'de' MMMM", {
                            locale: ptBR,
                          })
                        : ''
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="percentual"
                    stroke="#1E3A5F"
                    fill="url(#acerto)"
                    strokeWidth={2}
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
                  <Tooltip formatter={(value) => formatPercent(Number(value), 1)} />
                  <Bar dataKey="percentual" fill="#15803d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
