import { Link, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSimuladoResult } from '@/hooks/use-api'
import { formatDuration, formatPercent } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function SimuladoResultPage() {
  const { id } = useParams()
  const { data, isLoading, isError, refetch } = useSimuladoResult(id)
  const result = data?.resultado

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data || !result) {
    return <ErrorState onRetry={() => refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Resultado do simulado"
        description={data.simulado.titulo}
        actions={
          <Link to="/simulados">
            <Button variant="outline">Voltar</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Nota" value={formatPercent(result.percentual, 1)} />
        <Stat label="Acertos" value={`${result.acertos}/${result.total}`} />
        <Stat label="Erros" value={String(result.erros)} />
        <Stat label="Tempo" value={formatDuration(result.tempo_usado_segundos)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por disciplina</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {result.por_disciplina?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.por_disciplina}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="percentual" fill="#1E3A5F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados por disciplina.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section title="Pontos fortes" items={result.pontos_fortes} tone="success" />
            <Section title="Pontos fracos" items={result.pontos_fracos} tone="warning" />
            <Section title="Recomendações" items={result.recomendacoes} tone="secondary" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  items,
  tone,
}: {
  title: string
  items?: string[]
  tone: 'success' | 'warning' | 'secondary'
}) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={tone}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}
