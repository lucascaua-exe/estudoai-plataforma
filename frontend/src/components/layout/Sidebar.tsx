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
  Settings,
  Target,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuthStore } from '@/lib/auth-store'

const navItems = [
  { to: '/painel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/estudar', label: 'Estudar', icon: BookOpen },
  { to: '/questoes', label: 'Banco de Questões', icon: FileText },
  { to: '/simulados', label: 'Simulados', icon: GraduationCap },
  { to: '/revisao', label: 'Revisão Inteligente', icon: Brain },
  { to: '/erros', label: 'Meus Erros', icon: XCircle },
  { to: '/dominados', label: 'Conteúdos Dominados', icon: CheckCircle2 },
  { to: '/mapa', label: 'Mapa de Conhecimento', icon: Map },
  { to: '/assistente', label: 'Assistente IA', icon: MessageSquare },
  { to: '/relatorios', label: 'Relatórios', icon: LineChart },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/evolucao', label: 'Evolução', icon: Flag },
  { to: '/planos', label: 'Planos e faturas', icon: CreditCard },
  { to: '/perfil', label: 'Meu Perfil', icon: User },
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

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegação principal"
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="min-w-0">
            <p translate="no" className="font-brand text-xl text-primary">
              EstudoAI
            </p>
            <p className="truncate text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Central de Estudos
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              ref={closeRef}
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Menu do aplicativo">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                    strokeWidth={isActive ? 2 : 1.75}
                    aria-hidden
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-4">
          <div className="rounded-md bg-sidebar-accent px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name || 'Estudante'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.cargo_alvo || 'Analista de TI'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
