import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCatalog,
  useCreateCompeticao,
  useJoinCompeticao,
  useQuestionBancas,
} from '@/hooks/use-api'
import { useAuthStore } from '@/lib/auth-store'
import { saveCompeticaoToken } from '@/lib/competicao-token'
import { formatStudyText, getErrorMessage } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export function CompeticaoHubPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const catalog = useCatalog()
  const bancas = useQuestionBancas()
  const create = useCreateCompeticao()
  const join = useJoinCompeticao()

  const defaultApelido = (user?.name || user?.email?.split('@')[0] || 'Jogador').slice(0, 32)

  const [apelido, setApelido] = useState(defaultApelido)
  const [modo, setModo] = useState<'1x1' | 'todos'>('todos')
  const [quantidade, setQuantidade] = useState('10')
  const [tempo, setTempo] = useState('20')
  const [disciplina, setDisciplina] = useState('')
  const [assunto, setAssunto] = useState('')
  const [banca, setBanca] = useState('')
  const [codigo, setCodigo] = useState('')
  const [apelidoEntrar, setApelidoEntrar] = useState(defaultApelido)

  const assuntos = useMemo(() => {
    const d = catalog.data?.find((x) => String(x.id) === disciplina)
    return d?.assuntos ?? []
  }, [catalog.data, disciplina])

  const onCreate = async () => {
    const nick = apelido.trim()
    if (nick.length < 2) {
      toast.error('Informe um apelido com pelo menos 2 caracteres.')
      return
    }
    const qtd = Number(quantidade)
    if (!Number.isFinite(qtd) || qtd < 5 || qtd > 30) {
      toast.error('Quantidade deve ser entre 5 e 30.')
      return
    }
    const filtros: Record<string, unknown> = {}
    if (disciplina) filtros.disciplinas = [Number(disciplina)]
    if (assunto) filtros.assuntos = [Number(assunto)]
    if (banca) filtros.banca = banca

    try {
      const res = await create.mutateAsync({
        modo,
        quantidade: qtd,
        tempo_por_questao: Number(tempo) || 20,
        apelido: nick,
        filtros,
      })
      saveCompeticaoToken(res.id, res.token)
      toast.success(`Sala ${res.codigo} criada`)
      navigate(`/competicao/${res.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível criar a sala.'))
    }
  }

  const onJoin = async () => {
    const nick = apelidoEntrar.trim()
    const code = codigo.trim().toUpperCase()
    if (code.length < 4) {
      toast.error('Informe o código da sala.')
      return
    }
    if (nick.length < 2) {
      toast.error('Informe um apelido com pelo menos 2 caracteres.')
      return
    }
    try {
      const res = await join.mutateAsync({ codigo: code, apelido: nick })
      saveCompeticaoToken(res.id, res.token)
      toast.success(`Entrou como ${res.apelido}`)
      navigate(`/competicao/${res.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível entrar na sala.'))
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Competição"
        description="Desafie amigos em 1x1 ou todos contra todos — ranking ao vivo entre as questões."
      />

      {catalog.isLoading ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : catalog.isError ? (
        <ErrorState onRetry={() => catalog.refetch()} />
      ) : (
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" aria-hidden />
                Criar sala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comp-apelido">Seu apelido</Label>
                <Input
                  id="comp-apelido"
                  value={apelido}
                  maxLength={32}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Como vão te ver na sala"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="comp-modo">Modo</Label>
                  <Select
                    id="comp-modo"
                    value={modo}
                    onChange={(e) => setModo(e.target.value as '1x1' | 'todos')}
                  >
                    <option value="todos">Todos contra todos (até 20)</option>
                    <option value="1x1">1 contra 1</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-tempo">Tempo por questão</Label>
                  <Select id="comp-tempo" value={tempo} onChange={(e) => setTempo(e.target.value)}>
                    <option value="10">10 segundos</option>
                    <option value="15">15 segundos</option>
                    <option value="20">20 segundos</option>
                    <option value="30">30 segundos</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-qtd">Quantidade</Label>
                  <Input
                    id="comp-qtd"
                    type="number"
                    min={5}
                    max={30}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-banca">Banca (opcional)</Label>
                  <Select id="comp-banca" value={banca} onChange={(e) => setBanca(e.target.value)}>
                    <option value="">Todas</option>
                    {(bancas.data || []).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-disc">Disciplina</Label>
                  <Select
                    id="comp-disc"
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
                  <Label htmlFor="comp-ass">Assunto</Label>
                  <Select
                    id="comp-ass"
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
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={onCreate}
                disabled={create.isPending}
              >
                {create.isPending ? 'Criando…' : 'Criar e ir ao lobby'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Pontuação: acerto rápido vale mais (até 1000 pts). Erro ou timeout = 0.
              </p>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                Entrar com código
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comp-codigo">Código da sala</Label>
                <Input
                  id="comp-codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ex.: K7M2PX"
                  className="font-mono tracking-[0.2em] uppercase"
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-apelido-entrar">Seu apelido</Label>
                <Input
                  id="comp-apelido-entrar"
                  value={apelidoEntrar}
                  maxLength={32}
                  onChange={(e) => setApelidoEntrar(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={onJoin}
                disabled={join.isPending}
              >
                {join.isPending ? 'Entrando…' : 'Entrar na sala'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
