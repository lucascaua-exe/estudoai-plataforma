import { Flame, Zap } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { cn } from '@/lib/utils'

interface StatPillProps {
  value: number | string
  className?: string
  compact?: boolean
  centered?: boolean
}

export function XpPill({ value, className, compact, centered = true }: StatPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl border border-xp/30 bg-gradient-to-b from-sky-50 to-blue-100 text-xp-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-blue-950/70 dark:to-slate-900 dark:text-xp-foreground',
        centered ? 'flex-col justify-center gap-1.5 px-3 py-2.5 text-center' : 'flex-row gap-2 px-3 py-1.5',
        compact && (centered ? 'gap-1 px-2 py-2' : 'gap-1.5 px-2.5 py-1'),
        className,
      )}
      title="Pontos de experiência"
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-[0_2px_6px_rgba(37,99,235,0.35)] ring-2 ring-white/60 dark:ring-blue-950/40',
          compact ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Zap className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="currentColor" aria-hidden />
      </span>
      <div className={cn('leading-tight', !centered && 'min-w-0')}>
        <p className="text-[10px] font-bold tracking-[0.14em] text-blue-800/80 uppercase dark:text-blue-200/80">
          XP
        </p>
        <p
          className={cn(
            'font-display font-bold text-blue-900 dark:text-blue-100',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} />
          ) : (
            <span className="tabular-nums">{value}</span>
          )}
        </p>
      </div>
    </div>
  )
}

export function StreakPill({ value, className, compact, centered = true }: StatPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl border border-streak/30 bg-gradient-to-b from-cyan-50 to-sky-100 text-streak shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-cyan-950/50 dark:to-slate-900',
        centered ? 'flex-col justify-center gap-1.5 px-3 py-2.5 text-center' : 'flex-row gap-2 px-3 py-1.5',
        compact && (centered ? 'gap-1 px-2 py-2' : 'gap-1.5 px-2.5 py-1'),
        className,
      )}
      title="Sequência de dias estudando"
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(2,132,199,0.35)] ring-2 ring-white/60 dark:ring-sky-950/40',
          compact ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Flame className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="currentColor" aria-hidden />
      </span>
      <div className={cn('leading-tight', !centered && 'min-w-0')}>
        <p className="text-[10px] font-bold tracking-[0.14em] text-sky-800/80 uppercase dark:text-sky-200/80">
          Streak
        </p>
        <p
          className={cn(
            'font-display font-bold text-sky-900 dark:text-sky-100',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} suffix="d" />
          ) : (
            <>
              <span className="tabular-nums">{value}</span>
              <span className="ml-0.5 text-[11px] font-semibold opacity-70">d</span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
