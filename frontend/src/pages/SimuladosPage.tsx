import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ICON_WEIGHT, PlayIcon, PlusIcon } from '@/components/ui/icons'
import { toast } from 'sonner'
import { useCreateSimulado, useSimulados, useStartSimulado } from '@/hooks/use-api'
import { formatPercent, getErrorMessage } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog } from '@/components/ui/dialog'

const statusVariant: Record<string, 'secondary' | 'warning' | 'success' | 'outline'> = {
  rascunho: 'secondary',
  em_andamento: 'warning',
  finalizado: 'success',
}

export function SimuladosPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useSimulados()
  const create = useCreateSimulado()
  const start = useStartSimulado()
  const [open, setOpen] = useState(false)
  const [titulo, setTitulo] = useState('Simulado rápido')
  const [quantidade, setQuantidade] = useState('20')

  const onCreate = async () => {
    try {
      const simulado = await create.mutateAsync({
        titulo,
        quantidade: Number(quantidade) || 20,
        filtros: {},
      })
      setOpen(false)
      toast.success('Simulado criado.')
      const started = await start.mutateAsync({ id: simulado.id })
      sessionStorage.setItem(`simulado-${simulado.id}`, JSON.stringify(started))
      navigate(`/simulados/${simulado.id}/realizar`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível criar o simulado.'))
    }
  }

  const onResume = async (id: number, status: string) => {
    if (status === 'finalizado') {
      navigate(`/simulados/${id}/resultado`)
      return
    }
    try {
      const started = await start.mutateAsync({ id })
      sessionStorage.setItem(`simulado-${id}`, JSON.stringify(started))
      navigate(`/simulados/${id}/realizar`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível iniciar o simulado.'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Simulados"
        description="Treine no formato de prova e analise o desempenho."
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon className="h-4 w-4" weight={ICON_WEIGHT} />
            Novo simulado
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.results.length ? (
        <EmptyState
          title="Nenhum simulado ainda"
          description="Crie seu primeiro simulado para avaliar o nível de preparação."
          actionLabel="Criar simulado"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {data.results.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">{s.titulo}</h3>
                    <Badge variant={statusVariant[s.status] || 'outline'}>{s.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.quantidade} questões
                    {s.created_at
                      ? ` · ${format(new Date(s.created_at), "dd MMM yyyy", { locale: ptBR })}`
                      : ''}
                    {s.status === 'finalizado'
                      ? ` · ${formatPercent(s.percentual, 1)} de acerto`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {s.status === 'finalizado' ? (
                    <Link to={`/simulados/${s.id}/resultado`}>
                      <Button variant="outline">Ver resultado</Button>
                    </Link>
                  ) : (
                    <Button onClick={() => onResume(s.id, s.status)}>
                      <PlayIcon className="h-4 w-4" weight={ICON_WEIGHT} />
                      {s.status === 'em_andamento' ? 'Continuar' : 'Iniciar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Novo simulado"
        description="Defina o título e a quantidade de questões."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd">Quantidade</Label>
            <Input
              id="qtd"
              type="number"
              min={5}
              max={100}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={onCreate} disabled={create.isPending || start.isPending}>
            {create.isPending || start.isPending ? 'Preparando…' : 'Criar e iniciar'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
