import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ICON_WEIGHT, PlayIcon, ReviewIcon } from '@/components/ui/icons'
import { toast } from 'sonner'
import { useReviewRecommended, useStartReview } from '@/hooks/use-api'
import { formatPercent, getErrorMessage } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { ReviewItem } from '@/lib/types'

export function ReviewPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useReviewRecommended()
  const start = useStartReview()
  const [starting, setStarting] = useState(false)

  const onStart = async () => {
    setStarting(true)
    try {
      const session = await start.mutateAsync({ por_assunto: 5, max_assuntos: 4 })
      if (!session.questoes?.length) {
        toast.message('Nenhuma questão disponível para revisão no momento.')
        return
      }
      sessionStorage.setItem('review-session', JSON.stringify(session))
      navigate(`/questoes/${session.questoes[0].id}`)
      toast.success('Sessão de revisão iniciada.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível iniciar a revisão.'))
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Revisão Inteligente"
        description="Priorize assuntos com base no seu desempenho recente."
        actions={
          <Button onClick={onStart} disabled={starting || start.isPending}>
            <PlayIcon className="h-4 w-4" weight={ICON_WEIGHT} />
            {starting ? 'Preparando…' : 'Iniciar revisão'}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data ||
        (!data.prioridade_alta.length &&
          !data.prioridade_media.length &&
          !data.prioridade_baixa.length) ? (
        <EmptyState
          icon={ReviewIcon}
          title="Sem recomendações ainda"
          description="Responda mais questões para gerar um plano de revisão personalizado."
          actionLabel="Estudar agora"
          onAction={() => navigate('/estudar')}
        />
      ) : (
        <div className="space-y-6">
          <PriorityColumn title="Prioridade alta" items={data.prioridade_alta} tone="destructive" />
          <PriorityColumn title="Prioridade média" items={data.prioridade_media} tone="warning" />
          <PriorityColumn title="Prioridade baixa" items={data.prioridade_baixa} tone="success" />

          {data.erros_recentes?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Erros recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.erros_recentes.map((e) => (
                  <Link
                    key={e.questao_id}
                    to={`/questoes/${e.questao_id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <span>Questão #{e.questao_id}</span>
                    <span className="text-muted-foreground">{e.assunto || '—'}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}

function PriorityColumn({
  title,
  items,
  tone,
}: {
  title: string
  items: ReviewItem[]
  tone: 'destructive' | 'warning' | 'success'
}) {
  if (!items.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.assunto_id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div>
              <p className="font-medium text-foreground">{item.assunto}</p>
              <p className="text-sm text-muted-foreground">{item.disciplina}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.total} respostas</p>
            </div>
            <div className="text-right">
              <Badge variant={tone}>{formatPercent(item.percentual, 0)}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{item.nivel}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
