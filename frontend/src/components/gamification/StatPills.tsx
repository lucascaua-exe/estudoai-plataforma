import { Flame, Zap } from 'lucide-react'
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
        'inline-flex items-center rounded-2xl border border-xp/25 bg-gradient-to-b from-[#FFF7E8] to-[#FFE8B8] text-xp-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:from-[#3d2a0a] dark:to-[#2a1c06] dark:text-[#fcd34d]',
        centered ? 'flex-col justify-center gap-1.5 px-3 py-2.5 text-center' : 'flex-row gap-2 px-3 py-1.5',
        compact && (centered ? 'gap-1 px-2 py-2' : 'gap-1.5 px-2.5 py-1'),
        className,
      )}
      title="Pontos de experiência"
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FBBF24] via-[#F59E0B] to-[#D97706] text-white shadow-[0_2px_6px_rgba(217,119,6,0.35)] ring-2 ring-white/50',
          compact ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Zap className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="currentColor" aria-hidden />
      </span>
      <div className={cn('leading-tight', !centered && 'min-w-0')}>
        <p className="text-[10px] font-bold tracking-[0.14em] text-[#92400E]/80 uppercase dark:text-[#fcd34d]/80">
          XP
        </p>
        <p
          className={cn(
            'font-display font-bold tabular-nums text-[#78350F] dark:text-[#fde68a]',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export function StreakPill({ value, className, compact, centered = true }: StatPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl border border-streak/25 bg-gradient-to-b from-[#FFF1E8] to-[#FFD5B8] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:from-[#3b1a0d] dark:to-[#2a1208]',
        centered ? 'flex-col justify-center gap-1.5 px-3 py-2.5 text-center' : 'flex-row gap-2 px-3 py-1.5',
        compact && (centered ? 'gap-1 px-2 py-2' : 'gap-1.5 px-2.5 py-1'),
        className,
      )}
      title="Sequência de dias estudando"
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#C2410C] text-white shadow-[0_2px_6px_rgba(194,65,12,0.35)] ring-2 ring-white/50',
          compact ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Flame className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="currentColor" aria-hidden />
      </span>
      <div className={cn('leading-tight', !centered && 'min-w-0')}>
        <p className="text-[10px] font-bold tracking-[0.14em] text-[#9A3412]/80 uppercase dark:text-[#fdba74]/80">
          Streak
        </p>
        <p
          className={cn(
            'font-display font-bold tabular-nums text-[#9A3412] dark:text-[#fed7aa]',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          {value}
          <span className="ml-0.5 text-[11px] font-semibold opacity-70">d</span>
        </p>
      </div>
    </div>
  )
}
