import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Library,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { Fire, Lightning } from '@phosphor-icons/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuthStore } from '@/lib/auth-store'
import { formatDuration, formatPercent } from '@/lib/utils'
import { useDashboard, useGamification } from '@/hooks/use-api'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const CHART_BLUE = '#9A3412'
const CHART_GREEN = '#3F6F4E'
const CHART_RED = '#B42318'
const CHART_AMBER = '#B45309'
const PIE_COLORS = [CHART_GREEN, CHART_RED, CHART_AMBER, '#C2410C', '#78716C', '#44403C']

const DIFF_LABEL: Record<string, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  nao_informado: 'N/I',
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError, refetch } = useDashboard()
  const gamification = useGamification()

  const firstName = user?.name?.split(' ')[0] || 'estudante'
  const metaPct = data
    ? Math.min(100, (data.questoes_hoje / Math.max(1, data.meta_questoes_dia)) * 100)
    : 0

  const cobertura =
    data && data.total_questoes_banco
      ? Math.min(100, (data.questoes_respondidas / data.total_questoes_banco) * 100)
      : 0

  const pieAcertos =
    data && data.questoes_respondidas
      ? [
          { name: 'Acertos', value: data.questoes_acertadas },
          { name: 'Erros', value: data.questoes_erradas },
        ]
      : []

  const bancoChart = (data?.banco_por_disciplina || []).map((d) => ({
    nome: d.nome.length > 18 ? `${d.nome.slice(0, 16)}…` : d.nome,
    full: d.nome,
    questoes: d.questoes,
  }))

  const discChart = (data?.por_disciplina || []).map((d) => ({
    nome: d.nome.length > 16 ? `${d.nome.slice(0, 14)}…` : d.nome,
    full: d.nome,
    percentual: d.percentual,
    total: d.total,
  }))

  const diffChart = (data?.distribuicao_dificuldade || []).map((d) => ({
    nome: DIFF_LABEL[d.dificuldade] || d.dificuldade,
    total: d.total,
    percentual: d.percentual,
  }))

  return (
    <div className="animate-fade-up">
      <PageHeader
        align="center"
        title={`Oi, ${firstName}! Pronto para subir de nível?`}
        description="Missões do dia · Analista de TI — Araguaína/TO 2026"
        actions={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/estudar">
              <Button size="lg">Continuar estudando</Button>
            </Link>
            <Link to="/evolucao">
              <Button variant="outline">Ver evolução</Button>
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Library}
              label="Banco de questões"
              value={String(data.total_questoes_banco)}
              hint={`${data.questoes_nao_respondidas ?? '—'} ainda não respondidas`}
              tone="brand"
            />
            <KpiCard
              icon={BookOpen}
              label="Respondidas"
              value={String(data.questoes_respondidas)}
              hint={`${formatPercent(cobertura, 0)} do banco`}
            />
            <KpiCard
              icon={CheckCircle2}
              label="Acertos"
              value={String(data.questoes_acertadas)}
              hint={formatPercent(data.percentual_acerto, 1)}
              tone="success"
            />
            <KpiCard
              icon={XCircle}
              label="Erros"
              value={String(data.questoes_erradas)}
              hint={`${data.pontos_atencao} pontos de atenção`}
              tone="danger"
            />
            <KpiCard
              icon={TrendingUp}
              label="Aproveitamento"
              value={formatPercent(data.percentual_acerto, 1)}
              hint={`${data.evolucao_semana >= 0 ? '+' : ''}${data.evolucao_semana}% vs. semana`}
            />
            <KpiCard
              icon={({ className }) => <Fire weight="fill" className={className} />}
              label="Sequência"
              value={`${data.sequencia_atual} dias`}
              hint={`${data.dias_estudo} dias de estudo`}
              tone="brand"
            />
            <KpiCard
              icon={({ className }) => <Lightning weight="fill" className={className} />}
              label="Pontos"
              value={String(data.pontuacao_total || gamification.data?.pontos || 0)}
              hint={`${data.dominios_confirmados} domínios confirmados`}
            />
            <KpiCard
              icon={Target}
              label="Meta do dia"
              value={`${data.questoes_hoje}/${data.meta_questoes_dia}`}
              hint={formatDuration(data.tempo_total_segundos)}
            />
          </div>

          <div className="mx-auto mt-5 max-w-xl text-center">
            <Progress
              value={metaPct}
              indicatorClassName={metaPct >= 100 ? 'bg-success' : undefined}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Progresso da meta diária · {formatPercent(metaPct, 0)}
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Evolução do aproveitamento</CardTitle>
                <Badge variant="secondary">14 dias</Badge>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {(data.evolucao_diaria || []).length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.evolucao_diaria}>
                        <defs>
                          <linearGradient id="pctFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="data"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value) => [`${value}%`, 'Acerto']}
                          labelFormatter={(l) => `Dia ${l}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="percentual"
                          stroke={CHART_BLUE}
                          fill="url(#pctFill)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart
                      title="Sem histórico ainda"
                      hint="Responda questões para ver a curva de evolução."
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acertos × erros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {pieAcertos.length && data.questoes_respondidas > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieAcertos}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          <Cell fill={CHART_GREEN} />
                          <Cell fill={CHART_RED} />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart title="Sem respostas" hint="Comece pelo banco de questões." />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {discChart.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={discChart} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value, _n, item) => [
                            `${value}% (${item.payload.total} q.)`,
                            item.payload.full,
                          ]}
                        />
                        <Bar dataKey="percentual" fill={CHART_BLUE} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart
                      title="Sem desempenho por disciplina"
                      hint="Os gráficos aparecem após as primeiras respostas."
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Questões no banco por disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {bancoChart.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bancoChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [v, 'Questões']} labelFormatter={(_, p) => p?.[0]?.payload?.full || ''} />
                        <Bar dataKey="questoes" radius={[6, 6, 0, 0]}>
                          {bancoChart.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart
                      title="Banco ainda vazio"
                      hint="Execute a ingestão dos PDFs no backend."
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Por dificuldade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  {diffChart.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diffChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill={CHART_AMBER} name="Respondidas" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart title="Sem dados" hint="Responda questões de níveis variados." />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendação de hoje</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revisao_recomendada ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                      <div>
                        <p className="font-medium text-foreground">
                          {data.revisao_recomendada.assunto}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {data.revisao_recomendada.disciplina}
                        </p>
                      </div>
                    </div>
                    <Badge variant="warning">
                      {formatPercent(data.revisao_recomendada.percentual, 0)} ·{' '}
                      {data.revisao_recomendada.nivel}
                    </Badge>
                    <Link to="/revisao" className="block">
                      <Button className="w-full" variant="secondary">
                        Começar revisão
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <Target className="h-8 w-8 text-primary" />
                    <p>Responda questões para ativar recomendações personalizadas.</p>
                    <Link to="/questoes" className="block">
                      <Button variant="outline" className="w-full">
                        Ir ao banco
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atalhos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickLink to="/erros" title="Meus erros" desc={`${data.questoes_erradas} questões`} />
                <QuickLink
                  to="/mapa"
                  title="Mapa de conhecimento"
                  desc={`${data.pontos_atencao} pontos de atenção`}
                />
                <QuickLink
                  to="/simulados"
                  title="Simulados"
                  desc="Prova cronometrada"
                />
                <QuickLink
                  to="/dominados"
                  title="Conteúdos dominados"
                  desc={`${data.dominios_confirmados} confirmados`}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  hint: string
  tone?: 'default' | 'brand' | 'success' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
      : tone === 'danger'
        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200'
        : tone === 'brand'
          ? 'bg-primary/10 text-primary dark:bg-primary/20'
          : 'bg-secondary text-primary'

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col items-center px-4 pt-5 pb-5 text-center">
        <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-1.5 max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      </CardContent>
    </Card>
  )
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-border bg-background/60 px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  )
}

function EmptyChart({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
