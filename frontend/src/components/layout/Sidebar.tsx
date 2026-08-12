import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Brain,
  CheckCircle2,
  CreditCard,
  FileText,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Map,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { XpPill, StreakPill } from '@/components/gamification/StatPills'
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
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
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
        role="presentation"
        className={cn(
          'fixed inset-0 z-40 bg-foreground/30 transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          onClick={onClose}
          aria-label="Fechar menu"
          tabIndex={open ? 0 : -1}
        />
      </div>
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-[width,transform] duration-200 ease-out lg:static lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-[4.75rem] lg:w-[4.75rem]' : 'w-[17.5rem] lg:w-[17.5rem]',
        )}
        aria-label="Navegação principal"
        data-collapsed={collapsed || undefined}
      >
        <div
          className={cn(
            'flex items-center border-b border-sidebar-border px-3 py-3',
            collapsed ? 'flex-col gap-2' : 'justify-between gap-2 px-4 py-4',
          )}
        >
          <div className={cn('min-w-0', collapsed && 'text-center')}>
            <p
              translate="no"
              className={cn(
                'font-brand text-primary',
                collapsed ? 'text-sm leading-none' : 'text-xl',
              )}
            >
              {collapsed ? 'EA' : 'EstudoAI'}
            </p>
            {!collapsed ? (
              <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Preparação
              </p>
            ) : null}
          </div>
          <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
            {!collapsed ? <ThemeToggle /> : null}
            <button
              type="button"
              className="hidden min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir menu' : 'Retrair menu'}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              ref={closeRef}
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div
          className={cn(
            'mx-2 mt-3 grid gap-2',
            collapsed ? 'grid-cols-1 px-1' : 'mx-3 grid-cols-2',
          )}
        >
          <XpPill
            value={pontos}
            compact
            centered
            className={cn('w-full', collapsed && 'px-1.5 py-2')}
          />
          <StreakPill
            value={streak}
            compact
            centered
            className={cn('w-full', collapsed && 'px-1.5 py-2')}
          />
        </div>

        <nav
          className={cn(
            'mt-3 flex-1 space-y-0.5 overflow-y-auto pb-4',
            collapsed ? 'px-1.5' : 'px-3',
          )}
          aria-label="Menu"
        >
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={isActive ? 2.25 : 1.75}
                    aria-hidden
                  />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                  {collapsed ? <span className="sr-only">{label}</span> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={cn('space-y-2 border-t border-sidebar-border', collapsed ? 'p-2' : 'p-4')}>
          {!collapsed ? (
            <div className="rounded-xl bg-muted/60 px-3 py-3 text-center">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {user?.name || 'Estudante'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.cargo_alvo || 'Analista de TI · Araguaína'}
              </p>
            </div>
          ) : (
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary"
              title={user?.name || 'Estudante'}
            >
              {(user?.name || 'E').charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            className={cn(
              'flex min-h-11 w-full cursor-pointer items-center rounded-xl text-sm font-medium text-sidebar-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3 py-2',
            )}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
