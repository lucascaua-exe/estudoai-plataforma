import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Erro inesperado' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('EstudoAI ErrorBoundary:', error, info)
  }

  private async recover() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      /* ignore */
    }
    window.location.href = '/login'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F7F5F2] px-6 text-center">
        <p translate="no" className="font-brand text-2xl text-[#9A3412]">
          EstudoAI
        </p>
        <h1 className="font-display text-xl font-semibold text-[#1c1917]">
          Não foi possível carregar a página
        </h1>
        <p className="max-w-sm text-sm text-[#57534e]">
          Isso costuma acontecer após uma atualização. Toque em recarregar para limpar o cache
          e abrir o login.
        </p>
        <Button type="button" onClick={() => void this.recover()}>
          Recarregar aplicativo
        </Button>
      </div>
    )
  }
}
