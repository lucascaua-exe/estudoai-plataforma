import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/': 'EstudoAI — Preparação Concursos',
  '/login': 'Entrar',
  '/register': 'Assinar',
  '/privacidade': 'Privacidade',
  '/termos': 'Termos',
  '/painel': 'Dashboard',
  '/planos': 'Planos e faturas',
  '/estudar': 'Estudar',
  '/questoes': 'Banco de Questões',
  '/simulados': 'Simulados',
  '/revisao': 'Revisão Inteligente',
  '/erros': 'Meus Erros',
  '/dominados': 'Conteúdos Dominados',
  '/mapa': 'Mapa de Conhecimento',
  '/assistente': 'Assistente IA',
  '/relatorios': 'Relatórios',
  '/metas': 'Metas',
  '/evolucao': 'Evolução',
  '/perfil': 'Meu Perfil',
  '/configuracoes': 'Configurações',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/questoes/')) return 'Resolver questão'
  if (pathname.includes('/realizar')) return 'Realizar simulado'
  if (pathname.includes('/resultado')) return 'Resultado do simulado'
  return 'EstudoAI'
}

export function DocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = resolveTitle(pathname)
    document.title =
      pathname === '/' || page.startsWith('EstudoAI')
        ? page.startsWith('EstudoAI')
          ? page
          : 'EstudoAI — Preparação Concursos'
        : `${page} · EstudoAI`
  }, [pathname])

  return null
}
