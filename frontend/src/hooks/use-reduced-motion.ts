import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getReduced(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/**
 * Preferência de movimento do SO, com listener ao vivo (toggle sem reload).
 * SSR: inicia em false e sincroniza no effect.
 */
export function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export function prefersReducedMotion(): boolean {
  return getReduced()
}
