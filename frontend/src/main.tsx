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

/** Evita tela branca quando o SW/cache aponta para chunks antigos após deploy. */
function setupChunkRecovery() {
  const RELOAD_KEY = 'estudoai.chunk-reload'

  window.addEventListener('vite:preloadError', () => {
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_KEY, '1')
    } catch {
      /* ignore */
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
      window.location.reload()
    })()
  })

  window.addEventListener('unhandledrejection', (event) => {
    const msg = String((event.reason && event.reason.message) || event.reason || '')
    if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(msg)) {
      try {
        if (sessionStorage.getItem(RELOAD_KEY) === '1') return
        sessionStorage.setItem(RELOAD_KEY, '1')
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
        window.location.reload()
      })()
    }
  })
}

setupChunkRecovery()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Força atualização do SW após cada deploy
        void reg.update()
      })
      .catch(() => {
        /* PWA opcional */
      })
  })
}
