import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
}

export function Progress({
  className,
  value = 0,
  max = 100,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          indicatorClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
