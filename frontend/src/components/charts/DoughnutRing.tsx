import { motion } from 'motion/react'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type Slice = { label: string; value: number; color: string }

type DoughnutRingProps = {
  slices: Slice[]
  centerLabel?: string
  centerValue?: string
  className?: string
}

const SIZE = 160
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/**
 * Anel SVG próprio (sem legenda nativa do Chart.js).
 * Dois ou mais segmentos, centro tipográfico e legenda em lista.
 */
export function DoughnutRing({
  slices,
  centerLabel,
  centerValue,
  className,
}: DoughnutRingProps) {
  const reduce = useReducedMotionPreference()
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  const safe = total > 0 ? slices : [{ label: '—', value: 1, color: 'var(--border)' }]

  let offset = 0
  const arcs = safe.map((slice) => {
    const frac = total > 0 ? Math.max(0, slice.value) / total : 1 / safe.length
    const length = frac * CIRC
    const gap = safe.length > 1 && frac > 0 && frac < 1 ? 3 : 0
    const dash = Math.max(0, length - gap)
    const item = {
      ...slice,
      dash,
      offset,
      frac,
    }
    offset += length
    return item
  })

  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-5', className)}>
      <div className="relative grid place-items-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            centerValue && centerLabel
              ? `${centerLabel}: ${centerValue}`
              : slices.map((s) => `${s.label} ${s.value}`).join(', ')
          }
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={STROKE}
          />
          {arcs.map((arc, i) => (
            <motion.circle
              key={`${arc.label}-${i}`}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${arc.dash} ${CIRC - arc.dash}`}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              initial={
                reduce
                  ? { strokeDashoffset: -arc.offset, opacity: 0 }
                  : { strokeDashoffset: CIRC - arc.offset, opacity: 1 }
              }
              animate={{ strokeDashoffset: -arc.offset, opacity: 1 }}
              transition={{
                duration: reduce ? 0.15 : 0.7,
                delay: reduce ? 0 : i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </svg>

        {(centerValue || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue ? (
              <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {centerValue}
              </p>
            ) : null}
            {centerLabel ? (
              <p className="mt-0.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {centerLabel}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <ul className="grid w-full max-w-[16rem] grid-cols-2 gap-2">
        {slices.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0
          return (
            <li
              key={slice.label}
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-2.5 py-2"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: slice.color }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{slice.label}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {slice.value} · {pct}%
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
