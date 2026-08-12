import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bookmark, ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { useCatalog, useQuestions, useToggleFavorite, useToggleReview } from '@/hooks/use-api'
import { truncate } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'

const dificuldadeLabel: Record<string, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  nao_informado: 'N/I',
}

export function QuestionsPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || 1)
  const disciplina = params.get('disciplina') || ''
  const assunto = params.get('assunto') || ''
  const dificuldade = params.get('dificuldade') || ''
  const status = params.get('status') || ''

  const catalog = useCatalog()
  const query = useQuestions({
    page,
    disciplina: disciplina || undefined,
    assunto: assunto || undefined,
    dificuldade: dificuldade || undefined,
    status: status || undefined,
  })
  const favorite = useToggleFavorite()
  const review = useToggleReview()

  const assuntos = useMemo(() => {
    const d = catalog.data?.find((x) => String(x.id) === disciplina)
    return d?.assuntos ?? []
  }, [catalog.data, disciplina])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    if (key === 'disciplina') next.delete('assunto')
    setParams(next)
  }

  return (
    <div>
      <PageHeader
        title="Banco de Questões"
        description="Filtre, pratique e revise o conteúdo do edital."
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="filtro-disciplina" className="sr-only">
              Disciplina
            </Label>
            <Select
              id="filtro-disciplina"
              value={disciplina}
              onChange={(e) => update('disciplina', e.target.value)}
              aria-label="Filtrar por disciplina"
            >
              <option value="">Todas as disciplinas</option>
              {catalog.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-assunto" className="sr-only">
              Assunto
            </Label>
            <Select
              id="filtro-assunto"
              value={assunto}
              onChange={(e) => update('assunto', e.target.value)}
              disabled={!disciplina}
              aria-label="Filtrar por assunto"
            >
              <option value="">Todos os assuntos</option>
              {assuntos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-dificuldade" className="sr-only">
              Dificuldade
            </Label>
            <Select
              id="filtro-dificuldade"
              value={dificuldade}
              onChange={(e) => update('dificuldade', e.target.value)}
              aria-label="Filtrar por dificuldade"
            >
              <option value="">Todas as dificuldades</option>
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-status" className="sr-only">
              Status
            </Label>
            <Select
              id="filtro-status"
              value={status}
              onChange={(e) => update('status', e.target.value)}
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              <option value="nao_respondidas">Não respondidas</option>
              <option value="respondidas">Respondidas</option>
              <option value="erradas">Erradas</option>
              <option value="favoritas">Favoritas</option>
              <option value="revisao">Marcadas para revisão</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : !query.data?.results.length ? (
        <EmptyState
          title="Nenhuma questão encontrada"
          description="Ajuste os filtros ou importe o material do concurso."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {query.data.count} questão(ões) encontrada(s)
          </p>
          <div className="space-y-3">
            {query.data.results.map((q) => (
              <Card key={q.id} className="transition-colors hover:bg-muted/20">
                <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{q.disciplina_nome || 'Disciplina'}</Badge>
                      <Badge variant="outline">
                        {dificuldadeLabel[q.dificuldade] || q.dificuldade}
                      </Badge>
                      {q.respondida ? (
                        <Badge variant={q.acertou ? 'success' : 'destructive'}>
                          {q.acertou ? 'Acertou' : 'Errou'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não respondida</Badge>
                      )}
                    </div>
                    <Link
                      to={`/questoes/${q.id}`}
                      className="font-medium leading-snug text-foreground hover:text-primary"
                    >
                      {truncate(q.enunciado, 220)}
                    </Link>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {q.assunto_nome}
                      {q.documento_nome ? ` · ${q.documento_nome}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Favoritar"
                      aria-label={q.favorita ? 'Remover dos favoritos' : 'Favoritar questão'}
                      aria-pressed={!!q.favorita}
                      onClick={async () => {
                        try {
                          const r = await favorite.mutateAsync(q.id)
                          toast.success(r.favorita ? 'Favoritada' : 'Removida dos favoritos')
                        } catch (err) {
                          toast.error(getErrorMessage(err))
                        }
                      }}
                    >
                      <Bookmark
                        className={`h-4 w-4 ${q.favorita ? 'fill-primary text-primary' : ''}`}
                        aria-hidden
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Marcar revisão"
                      aria-label={
                        q.marcar_revisao ? 'Remover da revisão' : 'Marcar para revisão'
                      }
                      aria-pressed={!!q.marcar_revisao}
                      onClick={async () => {
                        try {
                          const r = await review.mutateAsync(q.id)
                          toast.success(
                            r.marcar_revisao ? 'Marcada para revisão' : 'Removida da revisão',
                          )
                        } catch (err) {
                          toast.error(getErrorMessage(err))
                        }
                      }}
                    >
                      <Flag
                        className={`h-4 w-4 ${q.marcar_revisao ? 'fill-warning text-warning' : ''}`}
                        aria-hidden
                      />
                    </Button>
                    <Link to={`/questoes/${q.id}`}>
                      <Button size="sm">Resolver</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={!query.data.previous}
              onClick={() => update('page', String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {page}</span>
            <Button
              variant="outline"
              disabled={!query.data.next}
              onClick={() => update('page', String(page + 1))}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
