import { AnimatePresence, motion } from 'motion/react'
import { Outlet, useLocation } from 'react-router-dom'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'
import { EASE_SMOOTH, MOTION } from '@/lib/motion'

/** Transição entre rotas: Fast (250ms) + Smooth ease out; reduce → Quick fade. */
export function PageTransition() {
  const location = useLocation()
  const reduce = useReducedMotionPreference()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="motion-keep-fade"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(2px)' }}
        transition={{
          duration: reduce ? MOTION.quick.s : MOTION.fast.s,
          ease: EASE_SMOOTH,
        }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
