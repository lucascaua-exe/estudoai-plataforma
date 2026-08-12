import * as React from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const THEME_KEY = 'estudoai-theme'
const MANUAL_KEY = 'estudoai-theme-manual'

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return (
      window.matchMedia('(max-width: 1023px)').matches ||
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    )
  } catch {
    return window.innerWidth < 1024
  }
}

function applyDomTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  root.setAttribute('data-theme', theme)
  const metaScheme = document.querySelector('meta[name="color-scheme"]')
  if (metaScheme) metaScheme.setAttribute('content', theme)
  const metaColor = document.querySelector('meta[name="theme-color"]')
  if (metaColor) {
    metaColor.setAttribute('content', theme === 'dark' ? '#1c1917' : '#F7F5F2')
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  const mobile = isMobileViewport()
  const manual = localStorage.getItem(MANUAL_KEY) === '1'
  const stored = localStorage.getItem(THEME_KEY)

  // Mobile: sempre light por padrão. Só respeita dark se o usuário escolheu no toggle.
  if (mobile) {
    if (manual && (stored === 'dark' || stored === 'light')) return stored
    return 'light'
  }

  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme)

  React.useLayoutEffect(() => {
    applyDomTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
      // Migração: se mobile abriu em light sem escolha manual, limpa dark antigo
      if (isMobileViewport() && theme === 'light' && localStorage.getItem(MANUAL_KEY) !== '1') {
        localStorage.setItem(THEME_KEY, 'light')
      }
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = React.useCallback((value: Theme) => {
    try {
      localStorage.setItem(MANUAL_KEY, '1')
    } catch {
      /* ignore */
    }
    setThemeState(value)
  }, [])

  const toggleTheme = React.useCallback(() => {
    try {
      localStorage.setItem(MANUAL_KEY, '1')
    } catch {
      /* ignore */
    }
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
