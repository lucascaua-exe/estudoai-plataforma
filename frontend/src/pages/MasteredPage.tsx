import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDeclareMastery, useMastery } from '@/hooks/use-api'
import { formatPercent, getErrorMessage } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export function MasteredPage() {
  const { data, isLoading, isError, refetch } = useMastery()
  const declare = useDeclareMastery()

  const mastered = data?.filter((m) => m.dominio_comprovado || m.dominio_declarado) || []
  const candidates =
    data?.filter((m) => !m.dominio_comprovado && !m.dominio_declarado && m.percentual_acerto >= 80) ||
    []

  return (
    <div>
      <PageHeader
        title="Conteúdos Dominados"
        description="Acompanhe assuntos com domínio declarado ou comprovado."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Dominados</h2>
            {!mastered.length ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhum conteúdo dominado ainda"
                description="Continue praticando até comprovar domínio nos assuntos."
              />
            ) : (
              <div className="space-y-3">
                {mastered.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex items-center justify-between gap-3 pt-5">
                      <div>
                        <p className="font-medium">{m.assunto}</p>
                        <p className="text-sm text-muted-foreground">{m.disciplina}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="success">{formatPercent(m.percentual_acerto, 0)}</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.dominio_comprovado ? 'Comprovado' : 'Declarado'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {candidates.length ? (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Prontos para declarar</h2>
              <div className="space-y-3">
                {candidates.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex items-center justify-between gap-3 pt-5">
                      <div>
                        <p className="font-medium">{m.assunto}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.disciplina} · {formatPercent(m.percentual_acerto, 0)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={declare.isPending}
                        onClick={async () => {
                          try {
                            await declare.mutateAsync(m.assunto_id)
                            toast.success('Domínio declarado.')
                          } catch (err) {
                            toast.error(getErrorMessage(err))
                          }
                        }}
                      >
                        Declarar domínio
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
