import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCatalog,
  useGenerateQuestions,
  useQuestionBancas,
  useQuestions,
} from '@/hooks/use-api'
import { formatStudyText, getErrorMessage } from '@/lib/utils'
import { solvePath } from '@/lib/question-filters'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export function StudyPage() {
  const navigate = useNavigate()
  const catalog = useCatalog()
  const bancas = useQuestionBancas()
  const [disciplina, setDisciplina] = useState('')
  const [assunto, setAssunto] = useState('')
  const [dificuldade, setDificuldade] = useState('')
  const [banca, setBanca] = useState('')
  const [quantidade, setQuantidade] = useState('5')
  const generate = useGenerateQuestions()

  const assuntos = useMemo(() => {
    const d = catalog.data?.find((x) => String(x.id) === disciplina)
    return d?.assuntos ?? []
  }, [catalog.data, disciplina])

  const filters = useMemo(
    () => ({
      disciplina: disciplina || undefined,
      assunto: assunto || undefined,
      dificuldade: dificuldade || undefined,
      banca: banca || undefined,
      status: 'nao_acertadas',
    }),
    [disciplina, assunto, dificuldade, banca],
  )

  const preview = useQuestions({
    ...filters,
    page: 1,
  })

  const start = () => {
    const first = preview.data?.results?.[0]
    if (first) {
      navigate(solvePath(first.id, filters), { state: { filters } })
      return
    }
    toast.message('Nenhuma questão disponível com esses filtros. Abrindo o banco…')
    const params = new URLSearchParams()
    if (disciplina) params.set('disciplina', disciplina)
    if (assunto) params.set('assunto', assunto)
    if (dificuldade) params.set('dificuldade', dificuldade)
    if (banca) params.set('banca', banca)
    params.set('status', 'nao_acertadas')
    navigate(`/questoes?${params.toString()}`)
  }

  const onGenerate = async () => {
    if (!assunto) {
      toast.error('Selecione um assunto para gerar questões.')
      return
    }
    try {
      const result = await generate.mutateAsync({
        assunto_id: Number(assunto),
        quantidade: Number(quantidade) || 3,
      })
      if (result.questoes?.length) {
        toast.success(`${result.questoes.length} questão(ões) gerada(s).`)
        navigate(solvePath(result.questoes[0].id, { status: 'nao_acertadas' }), {
          state: { filters: { status: 'nao_acertadas' } },
        })
      } else {
        toast.message(result.detail || 'Nenhuma questão gerada.')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao gerar questões.'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Estudar"
        description="Sessão rápida sem repetir questões que você já acertou."
      />

      {catalog.isLoading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : catalog.isError ? (
        <ErrorState onRetry={() => catalog.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Início rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estudo-disciplina">Disciplina</Label>
                <Select
                  id="estudo-disciplina"
                  value={disciplina}
                  onChange={(e) => {
                    setDisciplina(e.target.value)
                    setAssunto('')
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
                <Label htmlFor="estudo-assunto">Assunto</Label>
                <Select
                  id="estudo-assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  disabled={!disciplina}
                >
                  <option value="">Todos</option>
                  {assuntos.map((a) => (
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
              <Button className="w-full" size="lg" onClick={start} disabled={preview.isLoading}>
                <Play className="h-4 w-4" />
                Começar sessão
              </Button>
              <p className="text-xs text-muted-foreground">
                {preview.data
                  ? `${preview.data.count} questões pendentes com esses filtros.`
                  : 'Carregando disponibilidade…'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gerar com IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gere questões extras com base no material do assunto selecionado.
              </p>
              <div className="space-y-2">
                <Label htmlFor="estudo-quantidade">Quantidade</Label>
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
                disabled={generate.isPending || !assunto}
              >
                <Sparkles className="h-4 w-4" />
                {generate.isPending ? 'Gerando…' : 'Gerar questões'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
