import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
    'transition-[color,background-color,border-color,box-shadow,transform,opacity]',
    'duration-150 ease-[cubic-bezier(0.2,0,0,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer active:scale-[0.96]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-card hover:bg-muted text-foreground',
        ghost: 'hover:bg-muted text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        success: 'bg-success text-white hover:bg-success/90',
      },
      size: {
        default: 'h-10 min-h-10 px-4 py-2',
        sm: 'h-8 min-h-8 rounded-md px-3 text-xs',
        lg: 'h-11 min-h-11 rounded-lg px-6',
        icon: 'h-10 w-10 min-h-10 min-w-10',
      },
      pressScale: {
        true: '',
        false: 'active:scale-100',
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
  /** When false, disables active:scale press feedback */
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
