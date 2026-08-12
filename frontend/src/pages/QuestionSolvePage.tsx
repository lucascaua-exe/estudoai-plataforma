import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, CheckCircle2, Flag, XCircle } from 'lucide-react'
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
        res.correta ? 'Resposta correta!' : `Gabarito: ${res.gabarito}`,
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível enviar a resposta.'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Resolver questão"
        description={`${data.disciplina_nome || ''} · ${data.assunto_nome || ''}`}
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
              <Bookmark className={cn('h-4 w-4', data.favorita && 'fill-primary text-primary')} aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={
                data.marcar_revisao ? 'Remover da revisão' : 'Marcar para revisão'
              }
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
              <Flag className={cn('h-4 w-4', data.marcar_revisao && 'fill-warning text-warning')} aria-hidden />
            </Button>
            <Link to="/questoes">
              <Button variant="ghost">Voltar</Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-6 pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{data.dificuldade}</Badge>
            {data.origem === 'ai_generated' ? (
              <Badge variant="outline">Gerada por IA</Badge>
            ) : null}
          </div>

          <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
            {data.enunciado}
          </p>

          <div className="space-y-2">
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
                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected && !showFeedback && 'border-primary bg-primary/5',
                    showFeedback && isCorrect && 'border-success bg-success/10',
                    isWrong && 'border-destructive bg-destructive/10',
                    !isSelected && !showFeedback && 'border-border hover:bg-muted/40',
                  )}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                    {alt.letra}
                  </span>
                  <span className="flex-1 text-sm leading-relaxed">{alt.texto}</span>
                  {showFeedback && isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  ) : null}
                  {isWrong ? <XCircle className="h-5 w-5 shrink-0 text-destructive" /> : null}
                </button>
              )
            })}
          </div>

          {!result ? (
            <Button onClick={onAnswer} disabled={answer.isPending || selected == null}>
              {answer.isPending ? 'Enviando…' : 'Confirmar resposta'}
            </Button>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                {result.correta ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <p className="font-medium">
                  {result.correta ? 'Você acertou!' : `Resposta correta: ${result.gabarito}`}
                </p>
              </div>
              {result.explicacao ? (
                <div>
                  <p className="text-sm font-medium text-foreground">Explicação</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {result.explicacao}
                  </p>
                </div>
              ) : null}
              {result.fonte ? (
                <div className="text-xs text-muted-foreground">
                  Fonte: {result.fonte.documento || '—'}
                  {result.fonte.pagina ? ` · p. ${result.fonte.pagina}` : ''}
                  {result.fonte.assunto ? ` · ${result.fonte.assunto}` : ''}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate('/questoes')}>Voltar ao banco</Button>
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
