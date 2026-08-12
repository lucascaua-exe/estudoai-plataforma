import { useKnowledgeMap } from '@/hooks/use-api'
import { cn, formatPercent } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

const nivelColor: Record<string, string> = {
  dados_insuficientes: 'bg-muted text-muted-foreground',
  em_avaliacao: 'bg-secondary text-secondary-foreground',
  precisa_atencao: 'bg-destructive/15 text-destructive',
  em_desenvolvimento: 'bg-warning/15 text-warning',
  bom_dominio: 'bg-success/15 text-success',
  dominio_confirmado: 'bg-success text-white',
}

export function KnowledgeMapPage() {
  const { data, isLoading, isError, refetch } = useKnowledgeMap()

  return (
    <div>
      <PageHeader
        title="Mapa de Conhecimento"
        description="Visualize o domínio por disciplina e assunto."
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="Mapa ainda vazio"
          description="Responda questões para popular o mapa de conhecimento."
        />
      ) : (
        <div className="space-y-4">
          {data.map((disc) => (
            <Card key={disc.id}>
              <CardHeader>
                <CardTitle>{disc.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {disc.assuntos.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-lg border border-border p-3',
                        a.dominio_comprovado && 'ring-1 ring-success/40',
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{a.nome}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[11px] font-medium',
                            nivelColor[a.nivel] || 'bg-muted text-muted-foreground',
                          )}
                        >
                          {a.nivel.replaceAll('_', ' ')}
                        </span>
                        <Badge variant="outline">{formatPercent(a.percentual_acerto, 0)}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {a.total_respostas} respostas
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
