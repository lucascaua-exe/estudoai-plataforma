import { CARGO_SUGGESTIONS } from '@/lib/cargo-options'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type CargoFieldProps = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  hint?: string
  required?: boolean
  className?: string
}

/** Campo de cargo: digite livremente ou escolha uma sugestão. */
export function CargoField({
  id = 'cargo-alvo',
  label = 'Cargo alvo',
  value,
  onChange,
  hint = 'Escolha uma sugestão ou digite o cargo do seu concurso.',
  required,
  className,
}: CargoFieldProps) {
  const listId = `${id}-suggestions`

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: Analista Judiciário, Auditor…"
        autoComplete="organization-title"
        required={required}
      />
      <datalist id={listId}>
        {CARGO_SUGGESTIONS.map((cargo) => (
          <option key={cargo} value={cargo} />
        ))}
      </datalist>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {CARGO_SUGGESTIONS.slice(0, 8).map((cargo) => {
          const active = value.trim().toLowerCase() === cargo.toLowerCase()
          return (
            <button
              key={cargo}
              type="button"
              onClick={() => onChange(cargo)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-left text-[11px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
              )}
            >
              {cargo}
            </button>
          )
        })}
      </div>
    </div>
  )
}
