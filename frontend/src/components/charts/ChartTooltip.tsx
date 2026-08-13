import { cn } from '@/lib/utils'

type PayloadItem = {
  name?: string | number
  value?: string | number
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

type ChartTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: PayloadItem[]
  formatter?: (value: string | number, item: PayloadItem) => string
  labelFormatter?: (label: string | number, payload?: PayloadItem[]) => string
  className?: string
}

/** Tooltip compartilhado (Recharts) com visual azul/branco do tema. */
export function ChartTooltip({
  active,
  label,
  payload,
  formatter,
  labelFormatter,
  className,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const title =
    labelFormatter && label != null
      ? labelFormatter(label, payload)
      : label != null
        ? String(label)
        : null

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-lg shadow-primary/10 backdrop-blur-sm',
        className,
      )}
    >
      {title ? <p className="mb-1.5 font-semibold text-foreground">{title}</p> : null}
      <ul className="space-y-1">
        {payload.map((item, i) => {
          const raw = item.value ?? '—'
          const text = formatter ? formatter(raw, item) : String(raw)
          return (
            <li key={`${item.dataKey ?? item.name}-${i}`} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: item.color || 'var(--primary)' }}
                aria-hidden
              />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground">{text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
