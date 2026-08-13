import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { ICON_WEIGHT, LogoutIcon, MenuIcon } from '@/components/ui/icons'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { PageTransition } from '@/components/motion/PageTransition'
import { Button } from '@/components/ui/button'
import { XpPill, StreakPill } from '@/components/gamification/StatPills'
import { useAuthStore } from '@/lib/auth-store'
import { useGamification } from '@/hooks/use-api'

const COLLAPSE_KEY = 'estudoai.sidebar.collapsed'

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { data: gamification } = useGamification()

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const pontos = gamification?.pontos ?? user?.pontos ?? 0
  const streak = gamification?.sequencia_dias ?? user?.sequencia_dias ?? 0

  return (
    <div className="flex min-h-dvh bg-transparent">
      <a href="#conteudo-principal" className="skip-link">
        Ir para o conteúdo principal
      </a>
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-border/90 bg-card/90 px-2.5 py-2 shadow-[0_1px_0_rgba(37,99,235,0.06)] backdrop-blur-md sm:gap-3 sm:px-3 lg:hidden">
          <button
            type="button"
            className="inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="app-sidebar"
          >
            <MenuIcon className="h-5 w-5" weight="bold" aria-hidden />
          </button>

          <BrandLogo size="sm" compact className="h-8 min-w-0 max-w-[7.5rem] sm:max-w-[9rem]" />

          <div className="flex min-w-0 shrink-0 items-center gap-1">
            <XpPill
              value={pontos}
              compact
              centered={false}
              className="!max-w-[4.75rem] !gap-1 !overflow-hidden !px-1.5 !py-1"
            />
            <StreakPill
              value={streak}
              compact
              centered={false}
              className="!max-w-[4.75rem] !gap-1 !overflow-hidden !px-1.5 !py-1"
            />
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogoutIcon className="h-4 w-4" weight={ICON_WEIGHT} aria-hidden />
            </Button>
          </div>
        </header>

        <main
          id="conteudo-principal"
          className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-safe sm:px-4 sm:py-5 md:px-8 md:py-8"
          tabIndex={-1}
        >
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            <PageTransition />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
