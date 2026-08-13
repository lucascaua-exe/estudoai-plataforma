import { MoonIcon, SunIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? (
        <SunIcon className="h-4 w-4" weight="duotone" aria-hidden />
      ) : (
        <MoonIcon className="h-4 w-4" weight="duotone" aria-hidden />
      )}
    </Button>
  )
}
