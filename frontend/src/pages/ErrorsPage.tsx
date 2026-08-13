import { Link } from 'react-router-dom'
import { WarningIcon } from '@/components/ui/icons'
import { useErrors } from '@/hooks/use-api'
import { truncate } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export function ErrorsPage() {
  const { data, isLoading, isError, refetch } = useErrors({ ordem: 'recorrentes' })

  return (
    <div>
      <PageHeader
        title="Meus Erros"
        description="Revise as questões que você mais erra e transforme fraquezas em domínio."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={WarningIcon}
          title="Nenhum erro registrado"
          description="Quando você errar questões, elas aparecerão aqui para revisão."
        />
      ) : (
        <div className="space-y-3">
          {data.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{q.disciplina_nome}</Badge>
                    <Badge variant="destructive">{q.vezes_erro || 1}x erro</Badge>
                    {q.ponto_atencao ? <Badge variant="warning">Ponto de atenção</Badge> : null}
                  </div>
                  <p className="text-sm font-medium text-foreground">{truncate(q.enunciado, 200)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{q.assunto_nome}</p>
                </div>
                <Link to={`/questoes/${q.id}`}>
                  <Button size="sm">Revisar</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
