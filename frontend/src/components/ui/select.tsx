import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        'flex h-11 w-full appearance-none rounded-xl border border-input bg-card px-3.5 py-2 text-base text-foreground md:text-sm',
        'transition-[border-color,box-shadow,background-color] duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'
