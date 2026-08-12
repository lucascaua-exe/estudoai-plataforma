import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Brain,
  CheckCircle2,
  CreditCard,
  FileText,
  Flag,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Map,
  MessageSquare,
  Settings,
  Target,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuthStore } from '@/lib/auth-store'
import { useGamification } from '@/hooks/use-api'

const navItems = [
  { to: '/painel', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/estudar', label: 'Estudar', icon: BookOpen },
  { to: '/questoes', label: 'Questões', icon: FileText },
  { to: '/simulados', label: 'Simulados', icon: GraduationCap },
  { to: '/revisao', label: 'Revisão', icon: Brain },
  { to: '/erros', label: 'Meus erros', icon: XCircle },
  { to: '/dominados', label: 'Dominados', icon: CheckCircle2 },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/assistente', label: 'Assistente IA', icon: MessageSquare },
  { to: '/relatorios', label: 'Relatórios', icon: LineChart },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/evolucao', label: 'Evolução', icon: Flag },
  { to: '/planos', label: 'Planos', icon: CreditCard },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)
  const { data: gamification } = useGamification()

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login')
  }

  const pontos = gamification?.pontos ?? user?.pontos ?? 0
  const streak = gamification?.sequencia_dias ?? user?.sequencia_dias ?? 0

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/30 transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
          <div className="min-w-0">
            <p translate="no" className="font-brand text-xl text-primary">
              EstudoAI
            </p>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Preparação
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              ref={closeRef}
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-sidebar-accent lg:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div className="mx-3 mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-muted/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <Zap className="h-3.5 w-3.5 text-xp" aria-hidden /> XP
            </div>
            <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
              {pontos}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <Flame className="h-3.5 w-3.5 text-streak" aria-hidden /> Streak
            </div>
            <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
              {streak}d
            </p>
          </div>
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Menu">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-4">
          <div className="rounded-xl bg-muted/60 px-3 py-3">
            <p className="truncate font-display text-sm font-semibold text-foreground">
              {user?.name || 'Estudante'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.cargo_alvo || 'Analista de TI · Araguaína'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
