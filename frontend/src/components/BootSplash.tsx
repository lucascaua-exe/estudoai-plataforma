import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SEEN_KEY = 'estudoai.boot.seen'

/**
 * Animação de entrada ao abrir o app (PWA / primeira carga da sessão).
 * Tema claro por padrão no mobile; não bloqueia a UI por mais de ~1.1s.
 */
export function BootSplash() {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY) === '1') return
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(true)
    const leaveAt = window.setTimeout(() => setLeaving(true), 900)
    const hideAt = window.setTimeout(() => setVisible(false), 1250)
    return () => {
      window.clearTimeout(leaveAt)
      window.clearTimeout(hideAt)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[#F7F5F2] transition-opacity duration-300',
        leaving && 'opacity-0',
      )}
      aria-hidden
    >
      <div className="boot-splash-mark flex flex-col items-center gap-3">
        <div className="boot-splash-icon flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-primary shadow-[0_12px_40px_rgba(154,52,18,0.28)]">
          <svg viewBox="0 0 64 64" className="h-11 w-11" fill="none" aria-hidden>
            <path
              d="M18 40V24l14-6 14 6v16l-14 6-14-6z"
              stroke="#FFFBF7"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M32 20v26M18 24l14 6 14-6"
              stroke="#FFFBF7"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p translate="no" className="font-brand text-2xl tracking-tight text-primary">
          EstudoAI
        </p>
      </div>
    </div>
  )
}
