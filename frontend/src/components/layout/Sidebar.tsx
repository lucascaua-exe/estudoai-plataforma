import { useEffect, useId, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { BRAND_NAME } from '@/lib/brand'
import { displayCargo } from '@/lib/cargo-options'
import {
  AssistantIcon,
  BookIcon,
  CloseIcon,
  CompeteIcon,
  ErrorsIcon,
  EvolutionIcon,
  ExamIcon,
  GoalsIcon,
  HomeIcon,
  ICON_WEIGHT,
  ICON_WEIGHT_UI,
  LogoutIcon,
  MapIcon,
  MasteredIcon,
  PlansIcon,
  ProfileIcon,
  QuestionsIcon,
  ReportsIcon,
  ReviewIcon,
  SettingsIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  StreakIcon,
  XpIcon,
  type PhosphorIcon,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuthStore } from '@/lib/auth-store'
import { useGamification } from '@/hooks/use-api'
import { AnimatedNumber } from '@/components/ui/animated-number'

type NavItem = {
  to: string
  label: string
  icon: PhosphorIcon
  end?: boolean
}

type NavSection = {
  id: string
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'estudo',
    label: 'Estudo',
    items: [
      { to: '/painel', label: 'Início', icon: HomeIcon, end: true },
      { to: '/estudar', label: 'Estudar', icon: BookIcon },
      { to: '/questoes', label: 'Questões', icon: QuestionsIcon },
      { to: '/simulados', label: 'Simulados', icon: ExamIcon },
      { to: '/competicao', label: 'Competição', icon: CompeteIcon },
      { to: '/assistente', label: 'Assistente IA', icon: AssistantIcon },
    ],
  },
  {
    id: 'progresso',
    label: 'Progresso',
    items: [
      { to: '/revisao', label: 'Revisão', icon: ReviewIcon },
      { to: '/erros', label: 'Meus erros', icon: ErrorsIcon },
      { to: '/dominados', label: 'Dominados', icon: MasteredIcon },
      { to: '/mapa', label: 'Mapa', icon: MapIcon },
      { to: '/relatorios', label: 'Relatórios', icon: ReportsIcon },
      { to: '/metas', label: 'Metas', icon: GoalsIcon },
      { to: '/evolucao', label: 'Evolução', icon: EvolutionIcon },
    ],
  },
  {
    id: 'conta',
    label: 'Conta',
    items: [
      { to: '/planos', label: 'Planos', icon: PlansIcon },
      { to: '/perfil', label: 'Perfil', icon: ProfileIcon },
      { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
    ],
  },
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
  const asideRef = useRef<HTMLElement>(null)
  const labelId = useId()
  const { data: gamification } = useGamification()

  const pontos = gamification?.pontos ?? user?.pontos ?? 0
  const streak = gamification?.sequencia_dias ?? user?.sequencia_dias ?? 0
  const initials = (user?.name || 'E')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Trap de foco no drawer mobile
      if (e.key !== 'Tab' || !asideRef.current) return
      const focusable = asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login')
  }

  return (
    <>
      <div
        role="presentation"
        className={cn(
          'fixed inset-0 z-40 bg-[#0B1F3A]/40 backdrop-blur-[2px] transition-opacity duration-200 motion-keep-fade lg:hidden',
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
        ref={asideRef}
        id="app-sidebar"
        aria-labelledby={labelId}
        data-collapsed={collapsed || undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[17rem] flex-col border-r border-white/20 text-white',
          'shadow-[4px_0_28px_-8px_rgba(29,78,216,0.45)] transition-[width,transform] duration-200 ease-out',
          'motion-keep-fade lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-[4.5rem]' : 'w-[17rem]',
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-sidebar-border',
            collapsed ? 'flex-col gap-2 px-2 py-3' : 'justify-between gap-2 px-4 py-3.5',
          )}
        >
          <div className={cn('min-w-0', collapsed && 'flex justify-center')} id={labelId}>
            {collapsed ? (
              <span
                translate="no"
                className="font-brand text-sm leading-none tracking-tight text-white"
                aria-label={BRAND_NAME}
              >
                AF
              </span>
            ) : (
              <BrandLogo
                size="sm"
                variant="dark"
                compact
                className="h-10 max-w-[9.5rem] rounded-md bg-black/25"
              />
            )}
          </div>

          <div className={cn('flex items-center gap-0.5 [&_button]:text-white/85 [&_button:hover]:bg-sidebar-accent [&_button:hover]:text-white', collapsed && 'flex-col')}>
            {!collapsed ? <ThemeToggle /> : null}
            <button
              type="button"
              className="hidden min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-white/85 transition-colors duration-200 hover:bg-sidebar-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:inline-flex"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir menu' : 'Retrair menu'}
              aria-expanded={!collapsed}
              aria-controls="app-sidebar-nav"
            >
              {collapsed ? (
                <SidebarExpandIcon className="h-4 w-4" weight={ICON_WEIGHT_UI} aria-hidden />
              ) : (
                <SidebarCollapseIcon className="h-4 w-4" weight={ICON_WEIGHT_UI} aria-hidden />
              )}
            </button>
            <button
              ref={closeRef}
              type="button"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-white/85 transition-colors duration-200 hover:bg-sidebar-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <CloseIcon className="h-4 w-4" weight="bold" aria-hidden />
            </button>
          </div>
        </div>

        {/* Stats compactos */}
        <div className={cn('shrink-0 px-3 pt-3', collapsed && 'px-2')}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-chip text-white"
                title={`${pontos} XP`}
              >
                <XpIcon className="h-4 w-4" weight="fill" aria-hidden />
              </span>
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-chip text-white"
                title={`${streak} dias`}
              >
                <StreakIcon className="h-4 w-4" weight="fill" aria-hidden />
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-sidebar-border bg-black/10 p-2">
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-sidebar-chip px-2 py-1.5 text-sidebar-chip-foreground">
                <XpIcon className="h-4 w-4 shrink-0 text-amber-200" weight="fill" aria-hidden />
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
                    XP
                  </p>
                  <p className="truncate font-display text-sm font-semibold text-white">
                    <AnimatedNumber value={pontos} />
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-sidebar-chip px-2 py-1.5 text-sidebar-chip-foreground">
                <StreakIcon className="h-4 w-4 shrink-0 text-sky-200" weight="fill" aria-hidden />
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
                    Streak
                  </p>
                  <p className="truncate font-display text-sm font-semibold text-white">
                    <AnimatedNumber value={streak} suffix="d" />
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navegação agrupada — h-0+flex-1 força altura limitada e libera overflow-y */}
        <nav
          id="app-sidebar-nav"
          className={cn(
            'mt-3 h-0 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-3',
            collapsed ? 'px-1.5' : 'px-3',
          )}
          aria-label="Menu principal"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} role="group" aria-label={section.label}>
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">
                  {section.label}
                </p>
              ) : (
                <div className="mx-auto mb-1.5 h-px w-6 bg-white/25" aria-hidden />
              )}
              <ul className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onClose}
                      title={label}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex min-h-11 cursor-pointer items-center rounded-xl text-sm font-medium',
                          'transition-colors duration-200 ease-out motion-keep-fade',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                          isActive
                            ? 'bg-white text-[#1d4ed8] shadow-sm'
                            : 'text-white/95 hover:bg-white hover:text-[#1d4ed8]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <span
                              aria-hidden
                              className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#1d4ed8]"
                            />
                          ) : null}
                          <Icon
                            className="h-[1.15rem] w-[1.15rem] shrink-0"
                            weight={isActive ? 'fill' : ICON_WEIGHT}
                            aria-hidden
                          />
                          {!collapsed ? <span className="truncate">{label}</span> : null}
                          {collapsed ? <span className="sr-only">{label}</span> : null}
                          {isActive && !collapsed ? (
                            <span className="sr-only">(página atual)</span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Rodapé: usuário + sair */}
        <div
          className={cn(
            'shrink-0 space-y-2 border-t border-sidebar-border bg-black/10',
            collapsed ? 'p-2' : 'p-3',
          )}
        >
          {collapsed ? (
            <Link
              to="/perfil"
              onClick={onClose}
              title={user?.name || 'Perfil'}
              className="mx-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 font-display text-sm font-bold text-white transition-colors duration-200 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span aria-hidden>{initials || 'E'}</span>
              <span className="sr-only">Perfil</span>
            </Link>
          ) : (
            <Link
              to="/perfil"
              onClick={onClose}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-chip px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              title="Editar cargo e perfil"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-display text-sm font-bold text-white">
                {initials || 'E'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold text-white">
                  {user?.name || 'Estudante'}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-xs',
                    user?.cargo_alvo?.trim() ? 'text-white/75' : 'font-medium text-amber-200',
                  )}
                >
                  {displayCargo(user?.cargo_alvo, 'Definir seu cargo')}
                </span>
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            className={cn(
              'flex min-h-11 w-full cursor-pointer items-center rounded-xl text-sm font-medium text-white/80',
              'transition-colors duration-200 hover:bg-red-500/20 hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3',
            )}
            aria-label="Sair da conta"
          >
            <LogoutIcon className="h-4 w-4 shrink-0" weight={ICON_WEIGHT} aria-hidden />
            {!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
