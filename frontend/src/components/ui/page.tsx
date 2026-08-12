import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  align?: 'start' | 'center'
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  align = 'start',
}: PageHeaderProps) {
  const centered = align === 'center'

  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3',
        centered
          ? 'items-center text-center'
          : 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn(centered && 'mx-auto max-w-2xl')}>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-foreground md:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              'mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]',
              centered ? 'mx-auto max-w-xl' : 'max-w-2xl',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            centered && 'justify-center',
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  message = 'Não foi possível carregar os dados.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center',
        className,
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
