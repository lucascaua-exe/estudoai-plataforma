import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CheckIcon,
  CrownIcon,
  ErrorsIcon,
  ICON_WEIGHT,
  SpinnerIcon,
  TrophyIcon,
} from '@/components/ui/icons'
import { toast } from 'sonner'
import {
  useCompeticaoAvancar,
  useCompeticaoEstado,
  useCompeticaoIniciar,
  useCompeticaoResponder,
  useCompeticaoSair,
} from '@/hooks/use-api'
import {
  clearCompeticaoToken,
  getCompeticaoToken,
} from '@/lib/competicao-token'
import { cn, formatStudyText, getErrorMessage } from '@/lib/utils'
import type { CompeticaoRankingItem } from '@/lib/types'
import { ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

function RankingList({
  ranking,
  highlightId,
  animate,
  showRound,
}: {
  ranking: CompeticaoRankingItem[]
  highlightId?: number
  animate?: boolean
  showRound?: boolean
}) {
  return (
    <ol className="space-y-2">
      {ranking.map((r) => (
        <li
          key={r.id}
          className={cn(
            'flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-500',
            animate && 'animate-fade-up',
            r.id === highlightId
              ? 'border-primary/40 bg-primary/10'
              : 'border-border bg-card',
            r.posicao === 1 && 'ring-1 ring-amber-400/40',
          )}
          style={animate ? { animationDelay: `${(r.posicao - 1) * 60}ms` } : undefined}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                r.posicao === 1
                  ? 'bg-amber-400 text-amber-950'
                  : r.posicao === 2
                    ? 'bg-slate-300 text-slate-800'
                    : r.posicao === 3
                      ? 'bg-orange-300 text-orange-950'
                      : 'bg-muted text-muted-foreground',
              )}
            >
              {r.posicao}
            </span>
            <span className="truncate font-medium">
              {r.apelido}
              {r.is_host ? (
                <span className="ml-1 text-xs text-muted-foreground">(host)</span>
              ) : null}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-display text-sm font-semibold tabular-nums">
              {r.pontos} pts
            </span>
            {showRound && r.pontos_rodada != null ? (
              <p
                className={cn(
                  'text-xs tabular-nums',
                  r.pontos_rodada > 0 ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {r.pontos_rodada > 0 ? `+${r.pontos_rodada}` : '0'} nesta
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function TimerBar({
  restantes,
  total,
}: {
  restantes: number | null
  total: number
}) {
  const pct =
    restantes == null || total <= 0 ? 0 : Math.max(0, Math.min(100, (restantes / total) * 100))
  const urgent = restantes != null && restantes <= 5
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span>Tempo</span>
        <span className={cn('tabular-nums', urgent && 'text-destructive')}>
          {restantes ?? '—'}s
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-linear',
            urgent ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CompeticaoRoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const salaId = id ? Number(id) : undefined
  const [token, setToken] = useState<string | null>(() =>
    salaId ? getCompeticaoToken(salaId) : null,
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [localCountdown, setLocalCountdown] = useState<number | null>(null)

  const estado = useCompeticaoEstado(salaId, token)
  const iniciar = useCompeticaoIniciar()
  const responder = useCompeticaoResponder()
  const avancar = useCompeticaoAvancar()
  const sair = useCompeticaoSair()

  const data = estado.data

  useEffect(() => {
    if (salaId && !token) {
      toast.error('Sessão da sala não encontrada. Entre novamente.')
      navigate('/competicao')
    }
  }, [salaId, token, navigate])

  // Suaviza o timer entre polls
  useEffect(() => {
    if (data?.status !== 'question' || data.segundos_restantes == null) {
      setLocalCountdown(null)
      return
    }
    setLocalCountdown(data.segundos_restantes)
    const t = window.setInterval(() => {
      setLocalCountdown((prev) => (prev == null ? prev : Math.max(0, prev - 1)))
    }, 1000)
    return () => window.clearInterval(t)
  }, [data?.status, data?.indice_atual, data?.fase_iniciada_em, data?.segundos_restantes])

  useEffect(() => {
    setSelected(null)
  }, [data?.indice_atual, data?.status])

  // Host: auto-avançar após ~6s no reveal
  useEffect(() => {
    if (!data?.me?.is_host || data.status !== 'reveal' || !token || !salaId) return
    const t = window.setTimeout(() => {
      avancar.mutate({ id: salaId, token })
    }, 6500)
    return () => window.clearTimeout(t)
  }, [data?.status, data?.indice_atual, data?.me?.is_host, salaId, token])

  const alreadyAnswered = !!(
    data?.minha_resposta?.letra || data?.minha_resposta?.respondida
  )
  const locked = alreadyAnswered || responder.isPending || data?.status !== 'question'

  const onAnswer = async (letra: string) => {
    if (!salaId || !token || locked) return
    setSelected(letra)
    try {
      await responder.mutateAsync({ id: salaId, token, letra })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível enviar.'))
      setSelected(null)
    }
  }

  const onStart = async () => {
    if (!salaId || !token) return
    try {
      await iniciar.mutateAsync({ id: salaId, token })
      toast.success('Partida iniciada!')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível iniciar.'))
    }
  }

  const onLeave = async () => {
    if (!salaId || !token) {
      navigate('/competicao')
      return
    }
    try {
      await sair.mutateAsync({ id: salaId, token })
    } catch {
      /* ignore */
    }
    clearCompeticaoToken(salaId)
    setToken(null)
    navigate('/competicao')
  }

  const onAdvance = async () => {
    if (!salaId || !token) return
    try {
      await avancar.mutateAsync({ id: salaId, token })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Aguarde um momento.'))
    }
  }

  const copyCode = async () => {
    if (!data?.codigo) return
    try {
      await navigator.clipboard.writeText(data.codigo)
      toast.success('Código copiado')
    } catch {
      toast.message(data.codigo)
    }
  }

  const podium = useMemo(() => (data?.ranking || []).slice(0, 3), [data?.ranking])

  if (!token) {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }

  if (estado.isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (estado.isError || !data) {
    return (
      <ErrorState
        message="Não foi possível carregar a sala."
        onRetry={() => estado.refetch()}
      />
    )
  }

  if (data.status === 'cancelada') {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <p className="font-display text-lg font-semibold">Sala cancelada</p>
          <Button onClick={() => navigate('/competicao')}>Voltar</Button>
        </CardContent>
      </Card>
    )
  }

  /* ——— LOBBY ——— */
  if (data.status === 'lobby') {
    const canStart =
      data.me?.is_host &&
      data.participantes.length >= 2 &&
      (data.modo !== '1x1' || data.participantes.length === 2)

    return (
      <div className="animate-fade-up mx-auto max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Lobby · {data.modo === '1x1' ? '1x1' : 'Todos'}
            </p>
            <h1 className="font-display text-2xl font-semibold">Aguardando jogadores</h1>
          </div>
          <Button variant="ghost" onClick={onLeave}>
            Sair
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-5 pt-6">
            <button
              type="button"
              onClick={copyCode}
              className="mx-auto block w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center transition-colors hover:bg-primary/10"
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Código da sala
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-primary">
                {data.codigo}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Toque para copiar</p>
            </button>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{data.quantidade} questões</Badge>
              <Badge variant="outline">{data.tempo_por_questao}s cada</Badge>
              <Badge variant="secondary">
                {data.participantes.length}/{data.modo === '1x1' ? 2 : 20} jogadores
              </Badge>
            </div>
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {data.pontuacao?.descricao ||
                'Acerto rápido: até 1000 pts. Streak: +100 a +500. Erro/timeout: 0.'}
            </p>

            <div>
              <p className="mb-2 text-sm font-medium">Na sala</p>
              <ul className="space-y-2">
                {data.participantes.map((p, i) => (
                  <li
                    key={p.id}
                    className="animate-fade-up flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                      {p.apelido.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-medium">
                      {p.apelido}
                      {p.is_host ? (
                        <CrownIcon className="ml-1 inline h-3.5 w-3.5 text-amber-500" weight={ICON_WEIGHT} aria-label="Host" />
                      ) : null}
                      {data.me?.id === p.id ? (
                        <span className="ml-1 text-xs text-muted-foreground">(você)</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {data.me?.is_host ? (
              <Button
                className="w-full"
                size="lg"
                onClick={onStart}
                disabled={!canStart || iniciar.isPending}
              >
                {iniciar.isPending
                  ? 'Sorteando questões…'
                  : canStart
                    ? 'Iniciar partida'
                    : data.modo === '1x1'
                      ? 'Aguarde o oponente (2 jogadores)'
                      : 'Aguarde pelo menos 2 jogadores'}
              </Button>
            ) : (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <SpinnerIcon className="h-4 w-4 animate-spin" weight={ICON_WEIGHT} aria-hidden />
                Aguardando o host iniciar…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ——— QUESTION ——— */
  if (data.status === 'question' && data.questao) {
    const q = data.questao
    return (
      <div className="animate-fade-up mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Questão {q.numero} de {q.total}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatStudyText(q.disciplina || '')}
              {q.assunto ? ` · ${formatStudyText(q.assunto)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.me ? (
              <Badge variant="outline">{data.me.pontos} pts</Badge>
            ) : null}
            {(data.me?.streak ?? 0) > 0 ? (
              <Badge variant="warning">🔥 {data.me?.streak}x</Badge>
            ) : null}
            <Badge variant="secondary">
              {data.respondidos}/{data.total_ativos} responderam
            </Badge>
          </div>
        </div>

        <TimerBar
          restantes={localCountdown ?? data.segundos_restantes}
          total={data.tempo_por_questao}
        />

        <Card>
          <CardContent className="space-y-5 pt-6">
            <p className="text-pretty text-base font-medium leading-relaxed md:text-lg">
              {formatStudyText(q.enunciado)}
            </p>
            <div className="space-y-2.5" role="group" aria-label="Alternativas">
              {q.alternativas.map((alt) => {
                const isSel = selected === alt.letra || data.minha_resposta?.letra === alt.letra
                return (
                  <button
                    key={alt.letra}
                    type="button"
                    disabled={locked}
                    onClick={() => onAnswer(alt.letra)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all',
                      isSel
                        ? 'border-primary bg-primary/12 ring-2 ring-primary/25'
                        : 'border-border hover:border-primary/35 hover:bg-muted/40',
                      locked && !isSel && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        isSel ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                      )}
                    >
                      {alt.letra}
                    </span>
                    <span className="pt-1.5 text-sm font-medium leading-relaxed">
                      {formatStudyText(alt.texto)}
                    </span>
                  </button>
                )
              })}
            </div>
            {alreadyAnswered ? (
              <p className="text-center text-sm text-muted-foreground">
                Resposta enviada — aguardando os outros…
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Ranking ao vivo
            </p>
            <RankingList ranking={data.ranking} highlightId={data.me?.id} />
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ——— REVEAL ——— */
  if (data.status === 'reveal' && data.questao) {
    const q = data.questao
    return (
      <div className="animate-fade-up mx-auto max-w-3xl space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Resultado · Q{q.numero}/{q.total}
          </p>
          <h2 className="font-display text-xl font-semibold">
            {data.minha_resposta?.correta ? 'Você acertou!' : 'Resposta revelada'}
          </h2>
          {data.minha_resposta?.correta && data.minha_resposta.pontos != null ? (
            <p className="mt-1 text-sm text-success">
              +{data.minha_resposta.pontos} pontos
              {data.minha_resposta.tempo_ms != null
                ? ` · ${(data.minha_resposta.tempo_ms / 1000).toFixed(1)}s`
                : ''}
            </p>
          ) : data.minha_resposta && data.minha_resposta.correta === false ? (
            <p className="mt-1 text-sm text-destructive">+0 pontos</p>
          ) : null}
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {formatStudyText(q.enunciado)}
            </p>
            <div className="space-y-2">
              {q.alternativas.map((alt) => {
                const isCorrect = alt.correta === true
                const isMine = data.minha_resposta?.letra === alt.letra
                return (
                  <div
                    key={alt.letra}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border-2 px-4 py-3',
                      isCorrect && 'border-success/50 bg-success/10',
                      isMine && !isCorrect && 'border-destructive/40 bg-destructive/8',
                      !isCorrect && !isMine && 'border-border opacity-70',
                    )}
                  >
                    <span className="font-bold">{alt.letra}</span>
                    <span className="flex-1 text-sm">{formatStudyText(alt.texto)}</span>
                    {isCorrect ? (
                      <CheckIcon className="h-5 w-5 text-success" weight={ICON_WEIGHT} aria-label="Correta" />
                    ) : null}
                    {isMine && !isCorrect ? (
                      <ErrorsIcon className="h-5 w-5 text-destructive" weight={ICON_WEIGHT} aria-label="Sua escolha" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <TrophyIcon className="h-3.5 w-3.5" weight={ICON_WEIGHT} aria-hidden />
              Ranking
            </p>
            <RankingList ranking={data.ranking} highlightId={data.me?.id} animate showRound />
            {data.me?.is_host ? (
              <Button
                className="mt-4 w-full"
                onClick={onAdvance}
                disabled={avancar.isPending}
              >
                {avancar.isPending
                  ? 'Avançando…'
                  : data.indice_atual + 1 >= data.quantidade
                    ? 'Ver pódio final'
                    : 'Próxima questão'}
              </Button>
            ) : (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Próxima questão em instantes…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ——— FINISHED ——— */
  if (data.status === 'finished') {
    return (
      <div className="animate-fade-up mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <TrophyIcon className="mx-auto h-10 w-10 text-amber-500" weight={ICON_WEIGHT} aria-hidden />
          <h1 className="mt-3 font-display text-2xl font-semibold">Fim da partida</h1>
          {data.vencedor ? (
            <p className="mt-2 text-muted-foreground">
              Vencedor: <span className="font-semibold text-foreground">{data.vencedor.apelido}</span>{' '}
              com {data.vencedor.pontos} pts
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 items-end gap-2 px-2">
          {([podium[1], podium[0], podium[2]] as const).map((p, visualIdx) => {
            const place = visualIdx === 0 ? 2 : visualIdx === 1 ? 1 : 3
            const height =
              place === 1 ? 'min-h-36' : place === 2 ? 'min-h-28' : 'min-h-24'
            if (!p) {
              return (
                <div
                  key={`empty-${place}`}
                  className={cn('rounded-t-xl bg-muted/30', height)}
                />
              )
            }
            return (
              <div
                key={p.id}
                className={cn(
                  'animate-pop flex flex-col items-center justify-end rounded-t-2xl px-2 pb-3 pt-4 text-center',
                  place === 1 && 'bg-amber-400/25',
                  place === 2 && 'bg-slate-300/30',
                  place === 3 && 'bg-orange-300/25',
                  height,
                )}
              >
                <span className="text-lg font-bold">{place}º</span>
                <span className="mt-1 truncate text-sm font-semibold">{p.apelido}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{p.pontos} pts</span>
              </div>
            )
          })}
        </div>

        <Card>
          <CardContent className="pt-5">
            <RankingList ranking={data.ranking} highlightId={data.me?.id} animate />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate('/competicao')}>Nova competição</Button>
          <Link to="/estudar">
            <Button variant="outline">Estudar</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" weight={ICON_WEIGHT} />
      Sincronizando sala…
    </div>
  )
}
