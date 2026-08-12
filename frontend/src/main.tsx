import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Elemento #root não encontrado')
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

/** Se um chunk antigo falhar, limpa cache e recarrega uma vez. */
window.addEventListener('unhandledrejection', (event) => {
  const msg = String((event.reason && (event.reason as Error).message) || event.reason || '')
  if (
    !/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module/i.test(
      msg,
    )
  ) {
    return
  }
  try {
    if (sessionStorage.getItem('estudoai.chunk-reload') === '1') return
    sessionStorage.setItem('estudoai.chunk-reload', '1')
  } catch {
    return
  }
  void (async () => {
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
    window.location.replace('/login?nocache=' + Date.now())
  })()
})
