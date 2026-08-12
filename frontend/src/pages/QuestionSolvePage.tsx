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
import { cn, formatStudyText, getErrorMessage } from '@/lib/utils'
import type { AnswerResult } from '@/lib/types'
import { ErrorState } from '@/components/ui/page'
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
    window.scrollTo(0, 0)
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

  const enunciado = formatStudyText(data.enunciado)

  return (
    <div className="animate-fade-up mx-auto w-full min-w-0 max-w-3xl">
      {/* Cabeçalho compacto no mobile — evita cortar o enunciado */}
      <div className="mb-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Resolver questão
            </p>
            <h1 className="font-display text-lg font-semibold leading-snug text-foreground md:text-xl">
              {formatStudyText(data.disciplina_nome || 'Disciplina')}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {formatStudyText(data.assunto_nome || 'Assunto')}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
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
            <Link to="/questoes" className="hidden sm:inline-flex">
              <Button variant="ghost">Voltar</Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="min-w-0 overflow-x-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
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

        <CardContent className="min-w-0 space-y-5 px-4 pt-5 pb-6 sm:space-y-6 sm:px-6">
          <p className="text-pretty break-words text-[1.02rem] font-medium leading-[1.65] text-foreground [overflow-wrap:anywhere] md:text-lg">
            {enunciado}
          </p>

          <div className="min-w-0 space-y-2.5" role="radiogroup" aria-label="Alternativas">
            {alternativas.map((alt) => {
              const isSelected = selected === alt.id
              const showFeedback = !!result
              const isCorrect = alt.correta === true
              const isWrong = showFeedback && isSelected && !result?.correta
              const texto = formatStudyText(alt.texto)

              return (
                <button
                  key={alt.id}
                  type="button"
                  disabled={!!result || answer.isPending}
                  onClick={() => setSelected(alt.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-12 w-full min-w-0 max-w-full cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3.5 text-left transition-all duration-200 sm:px-4',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected &&
                      !showFeedback &&
                      'border-primary bg-primary/12 shadow-[0_0_0_1px_rgba(154,52,18,0.18)] ring-2 ring-primary/25',
                    showFeedback && isCorrect && 'border-success/60 bg-success/10',
                    isWrong && 'border-destructive/50 bg-destructive/8',
                    !isSelected &&
                      !showFeedback &&
                      'border-border bg-card hover:border-primary/35 hover:bg-muted/40',
                    (!!result || answer.isPending) && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                      isSelected && !showFeedback
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground',
                      showFeedback && isCorrect && 'bg-success text-white',
                      isWrong && 'bg-destructive text-white',
                    )}
                  >
                    {alt.letra}
                  </span>
                  <span className="min-w-0 flex-1 break-words pt-1.5 text-sm font-medium leading-relaxed [overflow-wrap:anywhere] md:text-[0.95rem]">
                    {texto}
                  </span>
                  {showFeedback && isCorrect ? (
                    <CheckCircle2
                      className="mt-1 h-5 w-5 shrink-0 text-success"
                      aria-label="Correta"
                    />
                  ) : null}
                  {isWrong ? (
                    <XCircle
                      className="mt-1 h-5 w-5 shrink-0 text-destructive"
                      aria-label="Incorreta"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          {!result ? (
            <div className="sticky bottom-[4.75rem] z-10 -mx-1 bg-gradient-to-t from-background via-background/95 to-transparent pt-3 pb-1 lg:static lg:bottom-auto lg:bg-transparent lg:pt-0">
              <Button
                size="lg"
                className="w-full shadow-md sm:w-auto"
                onClick={onAnswer}
                disabled={answer.isPending || selected == null}
              >
                {answer.isPending ? 'Corrigindo…' : 'Confirmar resposta'}
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                'animate-pop min-w-0 space-y-4 rounded-2xl border p-4 sm:p-5',
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
                <div className="min-w-0 space-y-2">
                  <p className="text-center text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Resolução rápida
                  </p>
                  <ExplanationContent text={result.explicacao} />
                </div>
              ) : null}

              {result.fonte ? (
                <p className="break-words text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]">
                  Fonte: {result.fonte.documento || '—'}
                  {result.fonte.pagina ? ` · p. ${result.fonte.pagina}` : ''}
                  {result.fonte.assunto ? ` · ${formatStudyText(result.fonte.assunto)}` : ''}
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
