import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useAnswerSimulado,
  useFinishSimulado,
  useStartSimulado,
} from '@/hooks/use-api'
import { cn, formatStudyText, getErrorMessage } from '@/lib/utils'
import { difficultyBadgeVariant, difficultyLabel } from '@/lib/utils'
import type { SimuladoStartResponse } from '@/lib/types'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { QuestionFigure } from '@/components/questions/QuestionFigure'

export function SimuladoTakePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const start = useStartSimulado()
  const answer = useAnswerSimulado()
  const finish = useFinishSimulado()
  const [session, setSession] = useState<SimuladoStartResponse | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [startedAt] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      const cached = sessionStorage.getItem(`simulado-${id}`)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as SimuladoStartResponse
          setSession(parsed)
          const initial: Record<number, string> = {}
          parsed.itens.forEach((item) => {
            if (item.letra_escolhida) initial[item.questao.id] = item.letra_escolhida
          })
          setAnswers(initial)
          setLoading(false)
          return
        } catch {
          /* fallthrough */
        }
      }
      try {
        const data = await start.mutateAsync({ id: Number(id) })
        sessionStorage.setItem(`simulado-${id}`, JSON.stringify(data))
        setSession(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const current = session?.itens[index]
  const total = session?.itens.length || 0
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  const selectLetter = async (letra: string) => {
    if (!session || !current || !id) return
    setAnswers((prev) => ({ ...prev, [current.questao.id]: letra }))
    try {
      await answer.mutateAsync({
        id: Number(id),
        questao_id: current.questao.id,
        letra,
      })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao salvar resposta.'))
    }
  }

  const onFinish = async () => {
    if (!id) return
    try {
      await finish.mutateAsync({
        id: Number(id),
        tempo_usado_segundos: Math.round((Date.now() - startedAt) / 1000),
      })
      sessionStorage.removeItem(`simulado-${id}`)
      toast.success('Simulado finalizado!')
      navigate(`/simulados/${id}/resultado`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível finalizar.'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !session || !current) {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  const selected = answers[current.questao.id]

  return (
    <div>
      <PageHeader
        title={session.simulado.titulo}
        description={`Questão ${index + 1} de ${total}`}
        actions={
          <Button variant="destructive" onClick={onFinish} disabled={finish.isPending}>
            {finish.isPending ? 'Finalizando…' : 'Finalizar'}
          </Button>
        }
      />

      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{answeredCount} respondidas</span>
          <span>{Math.round((answeredCount / Math.max(1, total)) * 100)}%</span>
        </div>
        <Progress value={answeredCount} max={total} />
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {current.questao.disciplina_nome || 'Disciplina'}
            </Badge>
            {current.questao.dificuldade ? (
              <Badge variant={difficultyBadgeVariant(current.questao.dificuldade)}>
                {difficultyLabel(current.questao.dificuldade)}
              </Badge>
            ) : null}
          </div>
          <p className="text-pretty break-words text-base leading-relaxed [overflow-wrap:anywhere]">
            {formatStudyText(current.questao.enunciado)}
          </p>
          {current.questao.imagem_url ? (
            <QuestionFigure
              src={current.questao.imagem_url}
              alt={`Figura da questão ${current.questao.numero_origem || current.questao.id}`}
            />
          ) : null}
          <div className="min-w-0 space-y-2" role="group" aria-label="Alternativas">
            {(current.questao.alternativas || []).map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => selectLetter(alt.letra)}
                aria-pressed={selected === alt.letra}
                className={cn(
                  'flex min-h-12 w-full min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3 text-left transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  selected === alt.letra
                    ? 'border-primary bg-primary/12 ring-2 ring-primary/25'
                    : 'border-border hover:border-primary/35 hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    selected === alt.letra
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-primary',
                  )}
                >
                  {alt.letra}
                </span>
                <span className="min-w-0 flex-1 break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {formatStudyText(alt.texto)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              Anterior
            </Button>
            <div className="flex flex-wrap justify-center gap-1" role="navigation" aria-label="Navegação das questões">
              {session.itens.map((item, i) => {
                const answered = !!answers[item.questao.id]
                const currentQ = i === index
                return (
                  <button
                    key={item.questao.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={currentQ ? 'true' : undefined}
                    aria-label={`Questão ${i + 1}${answered ? ', respondida' : ', pendente'}${currentQ ? ', atual' : ''}`}
                    className={cn(
                      'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xs font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      currentQ && 'bg-primary text-primary-foreground',
                      !currentQ && answered && 'bg-success/15 text-success',
                      !currentQ && !answered && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              disabled={index >= total - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
