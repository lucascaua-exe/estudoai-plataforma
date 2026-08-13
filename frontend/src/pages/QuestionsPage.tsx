import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  ICON_WEIGHT,
  ICON_WEIGHT_UI,
} from '@/components/ui/icons'
import {
  useCatalog,
  useQuestionBancas,
  useQuestions,
  useToggleFavorite,
  useToggleReview,
} from '@/hooks/use-api'
import {
  truncate,
  getErrorMessage,
  difficultyBadgeVariant,
  difficultyLabel,
  formatStudyText,
} from '@/lib/utils'
import { filtersFromSearchParams, solvePath } from '@/lib/question-filters'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'

function currentFilters(params: URLSearchParams) {
  return filtersFromSearchParams(params)
}

export function QuestionsPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || 1)
  const disciplina = params.get('disciplina') || ''
  const assunto = params.get('assunto') || ''
  const assuntos = params.get('assuntos') || ''
  const excluirAssuntos = params.get('excluir_assuntos') || ''
  const dificuldade = params.get('dificuldade') || ''
  const banca = params.get('banca') || ''
  // Default: esconde questões já acertadas
  const status = params.get('status') ?? 'nao_acertadas'

  const catalog = useCatalog()
  const bancas = useQuestionBancas()
  const query = useQuestions({
    page,
    disciplina: disciplina || undefined,
    assunto: assunto || undefined,
    assuntos: assuntos || undefined,
    excluir_assuntos: excluirAssuntos || undefined,
    dificuldade: dificuldade || undefined,
    banca: banca || undefined,
    status: status && status !== 'todas' ? status : undefined,
    excluir_acertadas: status === 'todas' ? 'false' : undefined,
  })
  const favorite = useToggleFavorite()
  const review = useToggleReview()

  const assuntosList = useMemo(() => {
    const d = catalog.data?.find((x) => String(x.id) === disciplina)
    return d?.assuntos ?? []
  }, [catalog.data, disciplina])

  const allAssuntos = useMemo(() => {
    if (!catalog.data) return []
    return catalog.data.flatMap((d) =>
      d.assuntos.map((a) => ({ ...a, disciplinaNome: d.nome, disciplinaId: d.id })),
    )
  }, [catalog.data])

  const excludedSet = useMemo(
    () => new Set(excluirAssuntos.split(',').filter(Boolean)),
    [excluirAssuntos],
  )

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    if (key === 'disciplina') {
      next.delete('assunto')
      next.delete('assuntos')
    }
    setParams(next)
  }

  const toggleExcluirAssunto = (id: string) => {
    const set = new Set(excludedSet)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    update('excluir_assuntos', Array.from(set).join(','))
  }

  const solveHref = (id: number) => {
    const filters = currentFilters(params)
    const full = solvePath(id, filters)
    const q = full.indexOf('?')
    return {
      pathname: q >= 0 ? full.slice(0, q) : full,
      search: q >= 0 ? full.slice(q) : '',
      state: { filters },
    }
  }

  return (
    <div>
      <PageHeader
        title="Banco de Questões"
        description="Filtre por banca e assuntos, pratique sem repetir o que você já acertou."
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="filtro-disciplina">Disciplina</Label>
            <Select
              id="filtro-disciplina"
              value={disciplina}
              onChange={(e) => update('disciplina', e.target.value)}
              aria-label="Filtrar por disciplina"
            >
              <option value="">Todas as disciplinas</option>
              {catalog.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatStudyText(d.nome)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-assunto">Assunto (foco)</Label>
            <Select
              id="filtro-assunto"
              value={assunto}
              onChange={(e) => update('assunto', e.target.value)}
              disabled={!disciplina}
              aria-label="Filtrar por assunto"
            >
              <option value="">Todos os assuntos</option>
              {assuntosList.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatStudyText(a.nome)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-banca">Banca</Label>
            <Select
              id="filtro-banca"
              value={banca}
              onChange={(e) => update('banca', e.target.value)}
              aria-label="Filtrar por banca"
            >
              <option value="">Todas as bancas</option>
              {(bancas.data || []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-dificuldade">Dificuldade</Label>
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
            <Label htmlFor="filtro-status">Status</Label>
            <Select
              id="filtro-status"
              value={status}
              onChange={(e) => update('status', e.target.value)}
              aria-label="Filtrar por status"
            >
              <option value="nao_acertadas">Pendentes (sem acerto)</option>
              <option value="nao_respondidas">Não respondidas</option>
              <option value="erradas">Só erradas</option>
              <option value="acertadas">Já acertadas</option>
              <option value="respondidas">Todas respondidas</option>
              <option value="favoritas">Favoritas</option>
              <option value="revisao">Marcadas para revisão</option>
              <option value="todas">Todas (inclui acertos)</option>
            </Select>
          </div>
        </CardContent>

        {disciplina ? (
          <CardContent className="border-t border-border/60 pt-4">
            <Label className="mb-2 block">Assuntos que NÃO quero praticar</Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Marque para excluir do banco nesta sessão. Assim você foca só no que importa.
            </p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {assuntosList.map((a) => {
                const id = String(a.id)
                const excluded = excludedSet.has(id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleExcluirAssunto(id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      excluded
                        ? 'border-destructive/40 bg-destructive/10 text-destructive line-through'
                        : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                    }`}
                    aria-pressed={excluded}
                  >
                    {formatStudyText(a.nome)}
                  </button>
                )
              })}
            </div>
            {excludedSet.size > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => update('excluir_assuntos', '')}
              >
                Limpar exclusões ({excludedSet.size})
              </Button>
            ) : null}
          </CardContent>
        ) : allAssuntos.length > 0 ? (
          <CardContent className="border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              Selecione uma disciplina para excluir assuntos específicos da prática.
            </p>
          </CardContent>
        ) : null}
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
                      <Badge variant="secondary">
                        {formatStudyText(q.disciplina_nome || 'Disciplina')}
                      </Badge>
                      <Badge variant={difficultyBadgeVariant(q.dificuldade)}>
                        {difficultyLabel(q.dificuldade)}
                      </Badge>
                      {q.banca ? <Badge variant="outline">{q.banca}</Badge> : null}
                      {q.respondida ? (
                        <Badge variant={q.acertou ? 'success' : 'destructive'}>
                          {q.acertou ? 'Acertou' : 'Errou'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não respondida</Badge>
                      )}
                    </div>
                    <Link
                      to={solveHref(q.id)}
                      className="font-medium leading-snug text-foreground hover:text-primary"
                    >
                      {truncate(formatStudyText(q.enunciado), 220)}
                    </Link>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatStudyText(q.assunto_nome || '')}
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
                      <BookmarkIcon
                        className={`h-4 w-4 ${q.favorita ? 'text-primary' : ''}`}
                        weight={q.favorita ? 'fill' : ICON_WEIGHT_UI}
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
                      <FlagIcon
                        className={`h-4 w-4 ${q.marcar_revisao ? 'text-warning' : ''}`}
                        weight={q.marcar_revisao ? 'fill' : ICON_WEIGHT_UI}
                        aria-hidden
                      />
                    </Button>
                    <Link to={solveHref(q.id)}>
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
              <ChevronLeftIcon className="h-4 w-4" weight={ICON_WEIGHT} />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {page}</span>
            <Button
              variant="outline"
              disabled={!query.data.next}
              onClick={() => update('page', String(page + 1))}
            >
              Próxima
              <ChevronRightIcon className="h-4 w-4" weight={ICON_WEIGHT} />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
