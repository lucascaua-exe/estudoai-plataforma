import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold',
    'cursor-pointer transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:translate-y-px',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-105',
        cta: 'bg-cta text-cta-foreground shadow-sm hover:brightness-105',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-accent',
        outline:
          'border border-border bg-card text-foreground shadow-sm hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted active:translate-y-0',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:brightness-105',
        success:
          'bg-success text-success-foreground shadow-sm hover:brightness-105',
        xp: 'bg-xp/15 text-xp-foreground border border-xp/25 hover:bg-xp/20',
      },
      size: {
        default: 'h-11 min-h-11 px-4 py-2',
        sm: 'h-9 min-h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 min-h-12 rounded-xl px-6 text-[0.9375rem]',
        icon: 'h-11 w-11 min-h-11 min-w-11',
      },
      pressScale: {
        true: '',
        false: 'active:translate-y-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      pressScale: true,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  pressScale?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pressScale, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, pressScale, className }))}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
