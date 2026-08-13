import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth-store'
import { useChangePassword, useGamification, useUpdateProfile } from '@/hooks/use-api'
import { getErrorMessage } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CargoField } from '@/components/profile/CargoField'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const update = useUpdateProfile()
  const changePassword = useChangePassword()
  const gamification = useGamification()
  const [profile, setProfile] = useState({
    name: '',
    concurso_alvo: '',
    cargo_alvo: '',
    data_prova: '',
    meta_questoes_dia: 50,
  })
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
  })

  useEffect(() => {
    if (!user) return
    setProfile({
      name: user.name || '',
      concurso_alvo: user.concurso_alvo || '',
      cargo_alvo: user.cargo_alvo || '',
      data_prova: user.data_prova || '',
      meta_questoes_dia: user.meta_questoes_dia || 50,
    })
  }, [user])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync({
        ...profile,
        data_prova: profile.data_prova || null,
      })
      toast.success('Perfil atualizado.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword.mutateAsync(passwords)
      setPasswords({ current_password: '', new_password: '' })
      toast.success('Senha alterada.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Meu Perfil"
        description="Atualize nome, concurso e cargo — o cargo aparece na barra lateral."
      />
      <p className="mb-4 text-sm text-muted-foreground">
        {user?.email || ''} · {gamification.data?.pontos ?? user?.pontos ?? 0} pontos
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="perfil-nome">Nome</Label>
                <Input
                  id="perfil-nome"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-concurso">Concurso alvo</Label>
                <Input
                  id="perfil-concurso"
                  value={profile.concurso_alvo}
                  onChange={(e) => setProfile((p) => ({ ...p, concurso_alvo: e.target.value }))}
                />
              </div>
              <CargoField
                id="perfil-cargo"
                value={profile.cargo_alvo}
                onChange={(cargo_alvo) => setProfile((p) => ({ ...p, cargo_alvo }))}
              />
              <div className="space-y-2">
                <Label htmlFor="perfil-data-prova">Data da prova</Label>
                <Input
                  id="perfil-data-prova"
                  type="date"
                  value={profile.data_prova || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, data_prova: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-meta">Meta diária de questões</Label>
                <Input
                  id="perfil-meta"
                  type="number"
                  min={1}
                  value={profile.meta_questoes_dia}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, meta_questoes_dia: Number(e.target.value) }))
                  }
                />
              </div>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Salvando…' : 'Salvar perfil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterar senha</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="senha-atual">Senha atual</Label>
                  <Input
                    id="senha-atual"
                    type="password"
                    autoComplete="current-password"
                    value={passwords.current_password}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, current_password: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-nova">Nova senha</Label>
                  <Input
                    id="senha-nova"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={passwords.new_password}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, new_password: e.target.value }))
                    }
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={changePassword.isPending}>
                  {changePassword.isPending ? 'Alterando…' : 'Alterar senha'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conquistas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(gamification.data?.conquistas || []).length ? (
                gamification.data!.conquistas.map((c) => (
                  <div
                    key={c.codigo}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.descricao}</p>
                    </div>
                    <Badge variant={c.conquistada ? 'success' : 'outline'}>
                      {c.conquistada ? `+${c.pontos}` : 'Bloqueada'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sequência atual: {gamification.data?.sequencia_dias ?? user?.sequencia_dias ?? 0}{' '}
                  dias
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
