import { motion } from 'motion/react'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type MetricBarItem = {
  id: string | number
  label: string
  value: number
  max?: number
  hint?: string
  tone?: 'brand' | 'success' | 'warning' | 'muted'
}

const TONE: Record<NonNullable<MetricBarItem['tone']>, string> = {
  brand: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  muted: 'bg-muted-foreground/50',
}

type MetricBarsProps = {
  items: MetricBarItem[]
  unit?: string
  className?: string
}

/** Barras horizontais minimalistas (em vez de bar chart denso). */
export function MetricBars({ items, unit = '%', className }: MetricBarsProps) {
  const reduce = useReducedMotionPreference()

  return (
    <ul className={cn('space-y-3.5', className)}>
      {items.map((item) => {
        const max = item.max ?? 100
        const pct = Math.max(0, Math.min(100, (item.value / Math.max(1, max)) * 100))
        return (
          <li key={item.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {item.hint ?? `${Math.round(item.value)}${unit}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn('h-full rounded-full', TONE[item.tone ?? 'brand'])}
                initial={reduce ? { opacity: 0, width: `${pct}%` } : { width: 0 }}
                animate={{ opacity: 1, width: `${pct}%` }}
                transition={{
                  duration: reduce ? 0.15 : 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
