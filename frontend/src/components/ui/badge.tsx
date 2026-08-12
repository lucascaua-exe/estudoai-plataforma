import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-card text-foreground',
        success: 'border-success/20 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/15 text-warning',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
        cta: 'border-cta/20 bg-cta/10 text-cta',
        easy: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        medium: 'border-amber-500/40 bg-amber-400/20 text-amber-800 dark:text-amber-300',
        hard: 'border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
