import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="relative"
    >
      <Sun
        className={cn(
          'h-4 w-4 absolute transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          isDark
            ? 'opacity-100 scale-100 blur-0'
            : 'opacity-0 scale-[0.25] blur-[4px] pointer-events-none',
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <Moon
        className={cn(
          'h-4 w-4 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          isDark
            ? 'opacity-0 scale-[0.25] blur-[4px] pointer-events-none'
            : 'opacity-100 scale-100 blur-0',
        )}
        strokeWidth={1.75}
        aria-hidden
      />
    </Button>
  )
}
