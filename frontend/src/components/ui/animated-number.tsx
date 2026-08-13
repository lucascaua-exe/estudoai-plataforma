import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'

type AnimatedNumberProps = {
  value: number
  className?: string
  suffix?: string
  prefix?: string
  locales?: string
  maximumFractionDigits?: number
}

export function AnimatedNumber({
  value,
  className,
  suffix,
  prefix,
  locales = 'pt-BR',
  maximumFractionDigits = 0,
}: AnimatedNumberProps) {
  return (
    <span className={cn('inline-flex items-baseline tabular-nums', className)}>
      {prefix ? <span className="mr-0.5">{prefix}</span> : null}
      <NumberFlow
        value={value}
        locales={locales}
        format={{ maximumFractionDigits }}
        transformTiming={{ duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        spinTiming={{ duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
      {suffix ? <span className="ml-0.5">{suffix}</span> : null}
    </span>
  )
}
