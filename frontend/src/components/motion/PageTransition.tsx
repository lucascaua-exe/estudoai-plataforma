import { AnimatePresence, motion } from 'motion/react'
import { Outlet, useLocation } from 'react-router-dom'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'

/** Transição entre rotas: slide leve ou só fade se reduce. */
export function PageTransition() {
  const location = useLocation()
  const reduce = useReducedMotionPreference()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="motion-keep-fade"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0 }}
        transition={{
          duration: reduce ? 0.15 : 0.26,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
