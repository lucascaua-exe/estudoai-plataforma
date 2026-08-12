import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
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
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="app-sidebar"
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>

          <span translate="no" className="font-brand text-lg text-primary">
            EstudoAI
          </span>

          <div className="flex items-center gap-1.5">
            <XpPill value={pontos} compact centered={false} className="!gap-1.5 !px-2 !py-1" />
            <StreakPill
              value={streak}
              compact
              centered={false}
              className="!gap-1.5 !px-2 !py-1"
            />
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </header>

        <main
          id="conteudo-principal"
          className="flex-1 px-4 py-5 pb-safe md:px-8 md:py-8"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
