import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  CompeteIcon,
  ErrorsIcon,
  GoalsIcon,
  ICON_WEIGHT,
  MapIcon,
  StreakIcon,
  TrendIcon,
  WarningIcon,
  XpIcon,
  type PhosphorIcon,
} from '@/components/ui/icons'
import { useAuthStore } from '@/lib/auth-store'
import { displayCargo } from '@/lib/cargo-options'
import { cn, formatDuration, formatPercent } from '@/lib/utils'
import { useDashboard, useGamification } from '@/hooks/use-api'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { AreaTrendChart } from '@/components/charts/AreaTrendChart'
import { DoughnutRing } from '@/components/charts/DoughnutRing'
import { MetricBars } from '@/components/charts/MetricBars'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/FadeIn'

const CHART_OK = '#0D9488'
const CHART_ERR = '#FB7185'

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

  const discBars =
    data?.por_disciplina?.map((d) => ({
      id: d.id,
      label: d.nome,
      value: d.percentual,
      hint: `${formatPercent(d.percentual, 0)} · ${d.total} q.`,
      tone: 'brand' as const,
    })) ?? []

  const diffBars =
    data?.distribuicao_dificuldade?.map((d) => ({
      id: d.dificuldade,
      label: DIFF_LABEL[d.dificuldade] || d.dificuldade,
      value: d.total,
      max: Math.max(...(data.distribuicao_dificuldade || []).map((x) => x.total), 1),
      hint: `${d.total} · ${formatPercent(d.percentual, 0)} acerto`,
      tone:
        d.dificuldade === 'dificil'
          ? ('warning' as const)
          : d.dificuldade === 'facil'
            ? ('success' as const)
            : ('brand' as const),
    })) ?? []

  const weekDelta = data?.evolucao_semana ?? 0

  return (
    <div className="space-y-6 md:space-y-8">
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data ? (
        <>
          {/* 1. Hero — foco do dia */}
          <FadeIn>
            <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(29,78,216,0.12)] sm:px-7 sm:py-7">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_280px_at_0%_0%,rgba(37,99,235,0.1),transparent_55%)]"
              />
              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:items-end">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Início · {displayCargo(user?.cargo_alvo, 'Escolha seu cargo no perfil')}
                  </p>
                  <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-balance text-foreground md:text-3xl">
                    Olá, {firstName}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
                    Meta de hoje, aproveitamento e o próximo passo — sem ruído.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to="/estudar">
                      <Button size="lg" className="gap-2">
                        Continuar estudando
                        <ArrowRightIcon className="h-4 w-4" weight={ICON_WEIGHT} aria-hidden />
                      </Button>
                    </Link>
                    <Link to="/evolucao">
                      <Button size="lg" variant="outline">
                        Ver evolução
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/70 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Meta do dia
                    </p>
                    <Badge variant={metaPct >= 100 ? 'success' : 'secondary'}>
                      {formatPercent(metaPct, 0)}
                    </Badge>
                  </div>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
                    <AnimatedNumber value={data.questoes_hoje} />
                    <span className="text-muted-foreground">/{data.meta_questoes_dia}</span>
                  </p>
                  <Progress
                    value={metaPct}
                    className="mt-3"
                    indicatorClassName={metaPct >= 100 ? 'bg-success' : undefined}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tempo total · {formatDuration(data.tempo_total_segundos)}
                  </p>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* 2. KPIs principais */}
          <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                icon={TrendIcon}
                label="Aproveitamento"
                value={data.percentual_acerto}
                suffix="%"
                decimals={1}
                hint={`${weekDelta >= 0 ? '+' : ''}${weekDelta}% vs. semana`}
                tone="brand"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={StreakIcon}
                label="Sequência"
                value={data.sequencia_atual}
                suffix=" dias"
                hint={`${data.dias_estudo} dias de estudo`}
                tone="brand"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={XpIcon}
                label="Pontos"
                value={data.pontuacao_total || gamification.data?.pontos || 0}
                hint={`${data.dominios_confirmados} domínios`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={BookIcon}
                label="Cobertura"
                value={cobertura}
                suffix="%"
                decimals={0}
                hint={`${data.questoes_respondidas}/${data.total_questoes_banco} do banco`}
              />
            </StaggerItem>
          </Stagger>

          {/* 3. Resumo fino */}
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat
                icon={CheckIcon}
                label="Acertos"
                value={data.questoes_acertadas}
                className="text-success"
              />
              <MiniStat
                icon={ErrorsIcon}
                label="Erros"
                value={data.questoes_erradas}
                className="text-destructive"
              />
              <MiniStat
                icon={WarningIcon}
                label="Atenção"
                value={data.pontos_atencao}
                className="text-warning"
              />
              <MiniStat
                icon={BookIcon}
                label="Pendentes"
                value={data.questoes_nao_respondidas ?? 0}
              />
            </div>
          </FadeIn>

          {/* 4. Gráficos principais */}
          <div className="grid gap-4 lg:grid-cols-3">
            <FadeIn delay={0.06} className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle>Curva de aproveitamento</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Últimos 14 dias</p>
                  </div>
                  <Badge variant="secondary">%</Badge>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-72">
                    {(data.evolucao_diaria || []).length ? (
                      <AreaTrendChart data={data.evolucao_diaria || []} />
                    ) : (
                      <EmptyChart
                        title="Sem histórico ainda"
                        hint="Responda questões para ver a curva."
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.08}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Acertos × erros</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Distribuição geral</p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-72">
                    {data.questoes_respondidas > 0 ? (
                      <DoughnutRing
                        slices={[
                          {
                            label: 'Acertos',
                            value: data.questoes_acertadas,
                            color: CHART_OK,
                          },
                          {
                            label: 'Erros',
                            value: data.questoes_erradas,
                            color: CHART_ERR,
                          },
                        ]}
                        centerValue={formatPercent(data.percentual_acerto, 0)}
                        centerLabel="acerto"
                      />
                    ) : (
                      <EmptyChart title="Sem respostas" hint="Comece pelo Estudar." />
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* 5. Disciplinas + dificuldade */}
          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn delay={0.1}>
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Por disciplina</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Aproveitamento relativo</p>
                  </div>
                  <Link
                    to="/mapa"
                    className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Mapa
                  </Link>
                </CardHeader>
                <CardContent>
                  {discBars.length ? (
                    <MetricBars items={discBars} />
                  ) : (
                    <EmptyChart
                      title="Sem desempenho por disciplina"
                      hint="Os dados aparecem após as primeiras respostas."
                    />
                  )}
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.12}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Por dificuldade</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Volume respondido</p>
                </CardHeader>
                <CardContent>
                  {diffBars.length ? (
                    <MetricBars items={diffBars} unit="" />
                  ) : (
                    <EmptyChart
                      title="Sem dados"
                      hint="Varie o nível das questões na prática."
                    />
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* 6. Próximo passo + atalhos */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <FadeIn delay={0.14}>
              <Card className="h-full border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
                <CardHeader>
                  <CardTitle>Próximo passo</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.revisao_recomendada ? (
                    <div className="space-y-4">
                      <div>
                        <p className="font-display text-lg font-semibold text-foreground">
                          {data.revisao_recomendada.assunto}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {data.revisao_recomendada.disciplina}
                        </p>
                      </div>
                      <Badge variant="warning">
                        {formatPercent(data.revisao_recomendada.percentual, 0)} ·{' '}
                        {data.revisao_recomendada.nivel}
                      </Badge>
                      <Link to="/revisao" className="block">
                        <Button className="w-full gap-2">
                          Começar revisão
                          <ArrowRightIcon className="h-4 w-4" weight={ICON_WEIGHT} aria-hidden />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Responda algumas questões para liberar uma recomendação personalizada.
                      </p>
                      <Link to="/estudar" className="block">
                        <Button variant="outline" className="w-full gap-2">
                          Ir para Estudar
                          <ArrowRightIcon className="h-4 w-4" weight={ICON_WEIGHT} aria-hidden />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.16}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Atalhos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ActionTile
                      to="/erros"
                      title="Meus erros"
                      desc={`${data.questoes_erradas} questões`}
                      icon={ErrorsIcon}
                    />
                    <ActionTile
                      to="/mapa"
                      title="Mapa"
                      desc={`${data.pontos_atencao} pontos`}
                      icon={MapIcon}
                    />
                    <ActionTile
                      to="/simulados"
                      title="Simulados"
                      desc="Prova cronometrada"
                      icon={GoalsIcon}
                    />
                    <ActionTile
                      to="/competicao"
                      title="Competição"
                      desc="Pratique em tempo real"
                      icon={CompeteIcon}
                    />
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </>
      ) : (
        <PageHeader title="Início" description="Carregando seu painel…" />
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
  suffix,
  decimals = 0,
}: {
  icon: PhosphorIcon
  label: string
  value: number
  hint: string
  tone?: 'default' | 'brand'
  suffix?: string
  decimals?: number
}) {
  return (
    <Card className="motion-keep-fade motion-no-translate h-full transition-[box-shadow,background-color,border-color] duration-200 hover:border-primary/25 hover:shadow-md hover:shadow-primary/8">
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <div
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            tone === 'brand' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground',
          )}
        >
          <Icon className="h-5 w-5" weight={ICON_WEIGHT} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
            <AnimatedNumber value={value} suffix={suffix} maximumFractionDigits={decimals} />
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: PhosphorIcon
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-3 py-2.5">
      <Icon
        className={cn('h-4 w-4 shrink-0 text-muted-foreground', className)}
        weight={ICON_WEIGHT}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-display text-sm font-semibold tabular-nums text-foreground">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </div>
  )
}

function ActionTile({
  to,
  title,
  desc,
  icon: Icon,
}: {
  to: string
  title: string
  desc: string
  icon: PhosphorIcon
}) {
  return (
    <Link
      to={to}
      className="motion-keep-fade motion-no-translate group flex items-start gap-3 rounded-xl border border-border bg-background/60 px-3 py-3 transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary/10">
        <Icon className="h-4 w-4" weight={ICON_WEIGHT} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
      </span>
    </Link>
  )
}

function EmptyChart({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center px-4 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <span className="sr-only">Carregando painel…</span>
    </div>
  )
}
