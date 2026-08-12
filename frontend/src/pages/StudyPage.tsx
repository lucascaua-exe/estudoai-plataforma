import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Play, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCatalog,
  useGenerateQuestions,
  useNextQuestion,
  useQuestionBancas,
  useQuestions,
} from '@/hooks/use-api'
import { formatStudyText, getErrorMessage } from '@/lib/utils'
import {
  cleanApiFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  solvePath,
} from '@/lib/question-filters'
import type { QuestionFilters } from '@/lib/types'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

const SESSION_MODES = [
  {
    value: 'nao_acertadas',
    label: 'Pendentes',
    hint: 'Não respondidas + erradas (sem repetir acertos)',
  },
  {
    value: 'nao_respondidas',
    label: 'Novas',
    hint: 'Apenas questões que você ainda não respondeu',
  },
  {
    value: 'erradas',
    label: 'Revisão de erros',
    hint: 'Só questões que você já errou e ainda não acertou',
  },
] as const

function buildFilters(params: {
  disciplina: string
  assunto: string
  dificuldade: string
  banca: string
  status: string
  excluirAssuntos: string
}): QuestionFilters {
  return {
    disciplina: params.disciplina || undefined,
    assunto: params.assunto || undefined,
    dificuldade: params.dificuldade || undefined,
    banca: params.banca || undefined,
    status: params.status || 'nao_acertadas',
    excluir_assuntos: params.excluirAssuntos || undefined,
  }
}

export function StudyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const catalog = useCatalog()
  const bancas = useQuestionBancas()
  const nextQuestion = useNextQuestion()
  const generate = useGenerateQuestions()

  const initial = filtersFromSearchParams(searchParams)
  const [disciplina, setDisciplina] = useState(initial.disciplina || '')
  const [assunto, setAssunto] = useState(initial.assunto || '')
  const [dificuldade, setDificuldade] = useState(initial.dificuldade || '')
  const [banca, setBanca] = useState(initial.banca || '')
  const [status, setStatus] = useState(initial.status || 'nao_acertadas')
  const [excluirAssuntos, setExcluirAssuntos] = useState(initial.excluir_assuntos || '')
  const [quantidade, setQuantidade] = useState('5')
  const [starting, setStarting] = useState(false)

  const assuntos = useMemo(() => {
    const d = catalog.data?.find((x) => String(x.id) === disciplina)
    return d?.assuntos ?? []
  }, [catalog.data, disciplina])

  const excludedSet = useMemo(
    () => new Set(excluirAssuntos.split(',').filter(Boolean)),
    [excluirAssuntos],
  )

  const filters = useMemo(
    () =>
      buildFilters({
        disciplina,
        assunto,
        dificuldade,
        banca,
        status,
        excluirAssuntos,
      }),
    [disciplina, assunto, dificuldade, banca, status, excluirAssuntos],
  )

  const apiFilters = useMemo(() => cleanApiFilters(filters), [filters])

  // Mantém URL sincronizada com o formulário (voltar da sessão restaura filtros)
  useEffect(() => {
    const next = filtersToSearchParams(filters)
    const cur = searchParams.toString()
    const nxt = next.toString()
    if (cur !== nxt) setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando filtros mudam
  }, [filters])

  const preview = useQuestions({
    ...apiFilters,
    page: 1,
  })

  const available = preview.data?.count ?? 0
  const canStart =
    !preview.isLoading && !preview.isError && available > 0 && !starting && !nextQuestion.isPending

  const modeHint =
    SESSION_MODES.find((m) => m.value === status)?.hint ||
    'Escolha o modo da sessão de prática.'

  const toggleExcluirAssunto = (id: string) => {
    const set = new Set(excludedSet)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    // Se excluiu o assunto focado, limpa o foco
    if (set.has(assunto)) setAssunto('')
    setExcluirAssuntos(Array.from(set).join(','))
  }

  const start = async () => {
    if (preview.isLoading) {
      toast.message('Aguarde o carregamento das questões disponíveis.')
      return
    }
    if (available <= 0) {
      toast.error('Nenhuma questão disponível com esses filtros.')
      return
    }
    if (assunto && !disciplina) {
      toast.error('Selecione a disciplina do assunto.')
      return
    }

    setStarting(true)
    try {
      // Mesmo endpoint da “próxima questão” → ordem consistente na sessão
      const res = await nextQuestion.mutateAsync(apiFilters)
      if (!res.id) {
        toast.message(res.detail || 'Nenhuma questão disponível com esses filtros.')
        return
      }
      sessionStorage.setItem(
        'study-session',
        JSON.stringify({ filters, startedAt: Date.now(), firstId: res.id }),
      )
      toast.success('Sessão iniciada')
      navigate(solvePath(res.id, filters), {
        state: { filters, fromStudy: true },
      })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível iniciar a sessão.'))
    } finally {
      setStarting(false)
    }
  }

  const onGenerate = async () => {
    if (!disciplina) {
      toast.error('Selecione a disciplina.')
      return
    }
    if (!assunto) {
      toast.error('Selecione um assunto para gerar questões.')
      return
    }
    const qtd = Number(quantidade)
    if (!Number.isFinite(qtd) || qtd < 1 || qtd > 10) {
      toast.error('Informe uma quantidade entre 1 e 10.')
      return
    }
    try {
      const result = await generate.mutateAsync({
        assunto_id: Number(assunto),
        quantidade: qtd,
      })
      if (!result.questoes?.length) {
        toast.message(result.detail || 'Nenhuma questão gerada.')
        return
      }
      const genFilters: QuestionFilters = {
        disciplina,
        assunto,
        status: 'nao_acertadas',
      }
      toast.success(`${result.questoes.length} questão(ões) gerada(s).`)
      navigate(solvePath(result.questoes[0].id, genFilters), {
        state: { filters: genFilters, fromStudy: true },
      })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao gerar questões.'))
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Estudar"
        description="Monte a sessão, pratique sem repetir acertos e avance questão a questão."
      />

      {catalog.isLoading ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : catalog.isError ? (
        <ErrorState onRetry={() => catalog.refetch()} />
      ) : (
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Sessão de prática</CardTitle>
                {preview.isLoading ? (
                  <Badge variant="outline">Contando…</Badge>
                ) : preview.isError ? (
                  <Badge variant="destructive">Erro ao carregar</Badge>
                ) : (
                  <Badge variant={available > 0 ? 'success' : 'outline'}>
                    {available} disponível{available === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{modeHint}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estudo-modo">Modo</Label>
                <Select
                  id="estudo-modo"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  aria-label="Modo da sessão"
                >
                  {SESSION_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estudo-disciplina">Disciplina</Label>
                  <Select
                    id="estudo-disciplina"
                    value={disciplina}
                    onChange={(e) => {
                      setDisciplina(e.target.value)
                      setAssunto('')
                      setExcluirAssuntos('')
                    }}
                  >
                    <option value="">Todas</option>
                    {catalog.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {formatStudyText(d.nome)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estudo-assunto">Assunto (foco)</Label>
                  <Select
                    id="estudo-assunto"
                    value={assunto}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v && excludedSet.has(v)) {
                        toast.message('Esse assunto está na lista de exclusão.')
                        return
                      }
                      setAssunto(v)
                    }}
                    disabled={!disciplina}
                  >
                    <option value="">Todos da disciplina</option>
                    {assuntos
                      .filter((a) => !excludedSet.has(String(a.id)))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {formatStudyText(a.nome)}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estudo-banca">Banca</Label>
                  <Select
                    id="estudo-banca"
                    value={banca}
                    onChange={(e) => setBanca(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {(bancas.data || []).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estudo-dificuldade">Dificuldade</Label>
                  <Select
                    id="estudo-dificuldade"
                    value={dificuldade}
                    onChange={(e) => setDificuldade(e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </Select>
                </div>
              </div>

              {disciplina && assuntos.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                  <Label>Assuntos que não quero nesta sessão</Label>
                  <p className="text-xs text-muted-foreground">
                    Toque para excluir. Assim você foca só no que importa.
                  </p>
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pt-1">
                    {assuntos.map((a) => {
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
                              : 'border-border bg-background text-foreground hover:bg-muted'
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
                      className="mt-1"
                      onClick={() => setExcluirAssuntos('')}
                    >
                      Limpar exclusões ({excludedSet.size})
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {preview.isError ? (
                <EmptyState
                  title="Não foi possível contar as questões"
                  description="Verifique a conexão e tente de novo."
                  actionLabel="Tentar novamente"
                  onAction={() => preview.refetch()}
                />
              ) : available === 0 && !preview.isLoading ? (
                <EmptyState
                  icon={BookOpen}
                  title="Nada para praticar com esses filtros"
                  description="Afrouxe banca/dificuldade, mude o modo ou abra o banco completo."
                  actionLabel="Abrir banco de questões"
                  onAction={() =>
                    navigate(`/questoes?${filtersToSearchParams(filters).toString()}`)
                  }
                />
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  className="w-full sm:flex-1"
                  size="lg"
                  onClick={start}
                  disabled={!canStart}
                >
                  <Play className="h-4 w-4" />
                  {starting || nextQuestion.isPending
                    ? 'Abrindo primeira questão…'
                    : 'Começar sessão'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    navigate(`/questoes?${filtersToSearchParams(filters).toString()}`)
                  }
                >
                  Ver no banco
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Fluxo: filtros → primeira questão → responder → próxima (sem repetir acertos).
              </p>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Gerar com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gere questões extras do assunto selecionado e entre direto na prática.
              </p>
              <div className="space-y-2">
                <Label htmlFor="estudo-quantidade">Quantidade (1–10)</Label>
                <Input
                  id="estudo-quantidade"
                  type="number"
                  min={1}
                  max={10}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={onGenerate}
                disabled={generate.isPending || !assunto || !disciplina}
              >
                <Sparkles className="h-4 w-4" />
                {generate.isPending ? 'Gerando…' : 'Gerar e praticar'}
              </Button>
              {!assunto ? (
                <p className="text-xs text-muted-foreground">
                  Selecione disciplina e assunto na sessão ao lado.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Assunto: {formatStudyText(assuntos.find((a) => String(a.id) === assunto)?.nome || '')}
                </p>
              )}
              <Link
                to="/revisao"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                Ir para revisão inteligente
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
