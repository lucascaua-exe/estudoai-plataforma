import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useConcurso, useUpdateConcurso } from '@/hooks/use-api'
import { useTheme } from '@/components/theme-provider'
import { getErrorMessage } from '@/lib/utils'
import { PageHeader, ErrorState } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { CargoField } from '@/components/profile/CargoField'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { data, isLoading, isError, refetch } = useConcurso()
  const update = useUpdateConcurso()
  const [form, setForm] = useState({
    nome: '',
    orgao: '',
    cargo: '',
    data_prova: '',
    banca: '',
    observacoes: '',
  })

  useEffect(() => {
    if (!data) return
    setForm({
      nome: data.nome || '',
      orgao: data.orgao || '',
      cargo: data.cargo || '',
      data_prova: data.data_prova || '',
      banca: data.banca || '',
      observacoes: data.observacoes || '',
    })
  }, [data])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync({
        ...form,
        data_prova: form.data_prova || null,
      })
      toast.success('Configurações do concurso salvas.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Ajuste o concurso alvo e a aparência da plataforma."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Concurso</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : (
              <form onSubmit={onSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-concurso-nome">Nome do concurso</Label>
                  <Input
                    id="cfg-concurso-nome"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Prefeitura de Araguaína/TO 2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-orgao">Órgão</Label>
                  <Input
                    id="cfg-orgao"
                    value={form.orgao}
                    onChange={(e) => setForm((f) => ({ ...f, orgao: e.target.value }))}
                  />
                </div>
                <CargoField
                  id="cfg-cargo"
                  label="Cargo"
                  value={form.cargo}
                  onChange={(cargo) => setForm((f) => ({ ...f, cargo }))}
                  hint="Aparece na barra do usuário. Escolha ou digite o seu."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cfg-data-prova">Data da prova</Label>
                    <Input
                      id="cfg-data-prova"
                      type="date"
                      value={form.data_prova}
                      onChange={(e) => setForm((f) => ({ ...f, data_prova: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cfg-banca">Banca</Label>
                    <Input
                      id="cfg-banca"
                      value={form.banca}
                      onChange={(e) => setForm((f) => ({ ...f, banca: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-obs">Observações</Label>
                  <Textarea
                    id="cfg-obs"
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Salvando…' : 'Salvar concurso'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolha entre tema claro e escuro. A preferência é salva neste dispositivo.
            </p>
            <div className="flex gap-2" role="group" aria-label="Tema">
              <Button
                type="button"
                variant={theme === 'light' ? 'default' : 'outline'}
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                Claro
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'default' : 'outline'}
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                Escuro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
