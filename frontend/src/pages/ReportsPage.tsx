import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useReports } from '@/hooks/use-api'
import { formatPercent, truncate } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Link } from 'react-router-dom'

export function ReportsPage() {
  const { data, isLoading, isError, refetch } = useReports()

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Visão geral do desempenho por disciplina e assunto."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.total_questoes === 0 ? (
        <EmptyState
          title="Sem dados suficientes"
          description="Responda questões para gerar relatórios de desempenho."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Questões" value={String(data.total_questoes)} />
            <Metric label="Acertos" value={String(data.total_acertos)} />
            <Metric label="Erros" value={String(data.total_erros)} />
            <Metric label="Acerto geral" value={formatPercent(data.percentual_acerto, 1)} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por disciplina</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.disciplinas || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="percentual" fill="#1E3A5F" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fortes e críticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Disciplinas fortes</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.disciplinas_fortes || []).map((d) => (
                      <Badge key={d.nome} variant="success">
                        {d.nome} · {formatPercent(d.percentual, 0)}
                      </Badge>
                    ))}
                    {!data.disciplinas_fortes?.length ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Disciplinas fracas</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.disciplinas_fracas || []).map((d) => (
                      <Badge key={d.nome} variant="destructive">
                        {d.nome} · {formatPercent(d.percentual, 0)}
                      </Badge>
                    ))}
                    {!data.disciplinas_fracas?.length ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Assuntos críticos</p>
                  <div className="space-y-1">
                    {(data.assuntos_criticos || []).slice(0, 6).map((a) => (
                      <p key={`${a.disciplina}-${a.assunto}`} className="text-sm text-muted-foreground">
                        {a.assunto} ({a.disciplina}) — {formatPercent(a.percentual, 0)}
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {data.questoes_mais_erradas?.length ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Questões mais erradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.questoes_mais_erradas.slice(0, 8).map((q) => (
                  <Link
                    key={q.questao_id}
                    to={`/questoes/${q.questao_id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
                  >
                    <span className="text-sm">{truncate(q.questao__enunciado, 100)}</span>
                    <Badge variant="destructive">{q.vezes}x</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
