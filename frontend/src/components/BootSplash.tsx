import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
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
        'pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300',
        leaving && 'opacity-0',
      )}
      aria-hidden
    >
      <div className="boot-splash-mark flex flex-col items-center">
        <BrandLogo size="hero" className="boot-splash-icon drop-shadow-sm" />
      </div>
    </div>
  )
}
