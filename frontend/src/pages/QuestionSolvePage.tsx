import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, CheckCircle2, Flag, Sparkles, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAnswerQuestion,
  useQuestion,
  useToggleFavorite,
  useToggleReview,
} from '@/hooks/use-api'
import { cn, getErrorMessage } from '@/lib/utils'
import type { AnswerResult } from '@/lib/types'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExplanationContent } from '@/components/questions/ExplanationContent'

export function QuestionSolvePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuestion(id)
  const answer = useAnswerQuestion()
  const favorite = useToggleFavorite()
  const review = useToggleReview()
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    setSelected(null)
    setResult(null)
  }, [id])

  const alternativas = useMemo(
    () => result?.alternativas || data?.alternativas || [],
    [result, data],
  )

  const onAnswer = async () => {
    if (!data || selected == null) {
      toast.error('Selecione uma alternativa.')
      return
    }
    try {
      const res = await answer.mutateAsync({
        id: data.id,
        alternativa_id: selected,
        tempo_segundos: Math.round((Date.now() - startedAt) / 1000),
      })
      setResult(res)
      toast[res.correta ? 'success' : 'error'](
        res.correta ? 'Resposta correta' : `Gabarito: ${res.gabarito}`,
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível enviar a resposta.'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />
  }

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <PageHeader
        title="Resolver questão"
        description={`${data.disciplina_nome || 'Disciplina'} · ${data.assunto_nome || 'Assunto'}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={data.favorita ? 'Remover dos favoritos' : 'Favoritar questão'}
              onClick={async () => {
                try {
                  const r = await favorite.mutateAsync(data.id)
                  toast.success(r.favorita ? 'Favoritada' : 'Removida dos favoritos')
                  refetch()
                } catch (err) {
                  toast.error(getErrorMessage(err))
                }
              }}
            >
              <Bookmark
                className={cn('h-4 w-4', data.favorita && 'fill-primary text-primary')}
                aria-hidden
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={data.marcar_revisao ? 'Remover da revisão' : 'Marcar para revisão'}
              onClick={async () => {
                try {
                  const r = await review.mutateAsync(data.id)
                  toast.success(
                    r.marcar_revisao ? 'Marcada para revisão' : 'Removida da revisão',
                  )
                  refetch()
                } catch (err) {
                  toast.error(getErrorMessage(err))
                }
              }}
            >
              <Flag
                className={cn('h-4 w-4', data.marcar_revisao && 'fill-warning text-warning')}
                aria-hidden
              />
            </Button>
            <Link to="/questoes">
              <Button variant="ghost">Voltar</Button>
            </Link>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-5 py-3">
          <p className="font-display text-sm font-semibold tracking-wide text-foreground">
            Questão #{data.numero_origem || data.id}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{data.dificuldade}</Badge>
            {data.origem === 'ai_generated' ? (
              <Badge variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden /> IA
              </Badge>
            ) : null}
          </div>
        </div>

        <CardContent className="space-y-6 pt-6">
          <p className="whitespace-pre-wrap text-[1.05rem] font-medium leading-relaxed text-foreground md:text-lg">
            {data.enunciado}
          </p>

          <div className="space-y-2.5" role="radiogroup" aria-label="Alternativas">
            {alternativas.map((alt) => {
              const isSelected = selected === alt.id
              const showFeedback = !!result
              const isCorrect = alt.correta === true
              const isWrong = showFeedback && isSelected && !result?.correta

              return (
                <button
                  key={alt.id}
                  type="button"
                  disabled={!!result || answer.isPending}
                  onClick={() => setSelected(alt.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-12 w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected && !showFeedback && 'border-primary bg-primary/5',
                    showFeedback && isCorrect && 'border-success/50 bg-success/8',
                    isWrong && 'border-destructive/40 bg-destructive/5',
                    !isSelected && !showFeedback && 'border-border bg-card hover:bg-muted/50',
                    (!!result || answer.isPending) && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                      isSelected && !showFeedback
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground',
                      showFeedback && isCorrect && 'bg-success text-white',
                      isWrong && 'bg-destructive text-white',
                    )}
                  >
                    {alt.letra}
                  </span>
                  <span className="flex-1 pt-1 text-sm font-medium leading-relaxed md:text-[0.95rem]">
                    {alt.texto}
                  </span>
                  {showFeedback && isCorrect ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" aria-label="Correta" />
                  ) : null}
                  {isWrong ? (
                    <XCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" aria-label="Incorreta" />
                  ) : null}
                </button>
              )
            })}
          </div>

          {!result ? (
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={onAnswer}
              disabled={answer.isPending || selected == null}
            >
              {answer.isPending ? 'Corrigindo…' : 'Confirmar resposta'}
            </Button>
          ) : (
            <div
              className={cn(
                'animate-pop space-y-4 rounded-2xl border p-5',
                result.correta
                  ? 'border-success/25 bg-success/5'
                  : 'border-destructive/20 bg-destructive/5',
              )}
            >
              <div className="flex items-start gap-3">
                {result.correta ? (
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success text-white">
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  </div>
                ) : (
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-white">
                    <XCircle className="h-5 w-5" aria-hidden />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">
                    {result.correta ? 'Resposta correta' : `Gabarito: ${result.gabarito}`}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {result.correta
                      ? 'Revise a explicação para consolidar.'
                      : 'Leia a resolução com calma e marque para revisão se precisar.'}
                  </p>
                </div>
              </div>

              {result.explicacao ? (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Resolução
                  </p>
                  <ExplanationContent text={result.explicacao} />
                </div>
              ) : null}

              {result.fonte ? (
                <p className="text-xs font-medium text-muted-foreground">
                  Fonte: {result.fonte.documento || '—'}
                  {result.fonte.pagina ? ` · p. ${result.fonte.pagina}` : ''}
                  {result.fonte.assunto ? ` · ${result.fonte.assunto}` : ''}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate('/questoes')}>Próximas questões</Button>
                <Button variant="outline" onClick={() => navigate('/estudar')}>
                  Nova sessão
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
