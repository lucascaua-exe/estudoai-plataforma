import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useGoals, useUpdateGoals } from '@/hooks/use-api'
import { getErrorMessage } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

export function GoalsPage() {
  const { data, isLoading, isError, refetch } = useGoals()
  const update = useUpdateGoals()
  const [form, setForm] = useState({
    questoes_dia: 50,
    questoes_semana: 250,
    horas_estudo: '2',
    percentual_acerto_desejado: 80,
  })

  useEffect(() => {
    if (!data) return
    setForm({
      questoes_dia: data.questoes_dia,
      questoes_semana: data.questoes_semana,
      horas_estudo: String(data.horas_estudo),
      percentual_acerto_desejado: data.percentual_acerto_desejado,
    })
  }, [data])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync({
        ...form,
        horas_estudo: form.horas_estudo,
      })
      toast.success('Metas atualizadas.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível salvar as metas.'))
    }
  }

  const progresso = data?.progresso
  const diaPct = progresso
    ? Math.min(100, (progresso.questoes_hoje / Math.max(1, progresso.meta_dia)) * 100)
    : 0
  const semanaPct = progresso
    ? Math.min(100, (progresso.questoes_semana / Math.max(1, progresso.meta_semana)) * 100)
    : 0

  return (
    <div>
      <PageHeader title="Metas" description="Defina objetivos diários e semanais de estudo." />

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Progresso atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Hoje</span>
                  <span>
                    {progresso?.questoes_hoje ?? 0}/{progresso?.meta_dia ?? form.questoes_dia}
                  </span>
                </div>
                <Progress value={diaPct} />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Semana</span>
                  <span>
                    {progresso?.questoes_semana ?? 0}/{progresso?.meta_semana ?? form.questoes_semana}
                  </span>
                </div>
                <Progress value={semanaPct} indicatorClassName="bg-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurar metas</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Questões por dia</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.questoes_dia}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, questoes_dia: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Questões por semana</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.questoes_semana}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, questoes_semana: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horas de estudo / dia</Label>
                  <Input
                    value={form.horas_estudo}
                    onChange={(e) => setForm((f) => ({ ...f, horas_estudo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentual de acerto desejado</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.percentual_acerto_desejado}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        percentual_acerto_desejado: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Salvando…' : 'Salvar metas'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
