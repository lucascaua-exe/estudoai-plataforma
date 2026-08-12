import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Landing pública em manutenção — entrada oficial é o login. */
export function MaintenancePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="animate-fade-up mx-auto max-w-md space-y-5">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-7 w-7" aria-hidden />
        </div>
        <p translate="no" className="font-brand text-3xl text-primary">
          EstudoAI
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Página em manutenção
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A landing page está temporariamente indisponível. Acesse a plataforma pelo login para
          continuar seus estudos.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link to="/login">
            <Button size="lg">Ir para o login</Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="outline">
              Criar conta
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
