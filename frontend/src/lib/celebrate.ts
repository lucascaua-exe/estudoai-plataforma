import confetti from 'canvas-confetti'
import { prefersReducedMotion } from '@/hooks/use-reduced-motion'

/** Confetes leves ao acertar (Tier 1 — removido com reduced motion). */
export function celebrateCorrect() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return

  const colors = ['#2563EB', '#60A5FA', '#38BDF8', '#FFFFFF', '#0EA5E9']

  void confetti({
    particleCount: 72,
    spread: 62,
    startVelocity: 34,
    origin: { y: 0.62 },
    colors,
    disableForReducedMotion: true,
  })

  window.setTimeout(() => {
    void confetti({
      particleCount: 36,
      angle: 60,
      spread: 48,
      origin: { x: 0.12, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    })
    void confetti({
      particleCount: 36,
      angle: 120,
      spread: 48,
      origin: { x: 0.88, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    })
  }, 140)
}
