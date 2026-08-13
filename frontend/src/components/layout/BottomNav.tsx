import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Swords,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/painel', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/estudar', label: 'Estudar', icon: BookOpen },
  { to: '/questoes', label: 'Questões', icon: FileText },
  { to: '/competicao', label: 'Competir', icon: Swords },
  { to: '/perfil', label: 'Mais', icon: MoreHorizontal },
]

export function BottomNav() {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pt-1 shadow-[0_-6px_20px_rgba(11,31,58,0.07)] backdrop-blur-md lg:hidden"
      aria-label="Navegação rápida"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold tracking-wide transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200',
                      isActive && 'bg-primary/10',
                    )}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={isActive ? 2.25 : 1.75}
                      aria-hidden
                    />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
