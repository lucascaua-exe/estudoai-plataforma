import { motion, type HTMLMotionProps } from 'motion/react'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'
import { EASE_SMOOTH, MOTION } from '@/lib/motion'

type FadeInProps = HTMLMotionProps<'div'> & {
  delay?: number
  /** Deslocamento vertical (Tier 2 → removido quando reduce). */
  y?: number
  duration?: number
}

/**
 * Entrada acessível:
 * - motion OK: fade + leve slide (Fast 250ms, Smooth)
 * - reduce: só fade Quick (150ms)
 */
export function FadeIn({
  className,
  delay = 0,
  y = 8,
  duration = MOTION.fast.s,
  children,
  ...props
}: FadeInProps) {
  const reduce = useReducedMotionPreference()

  return (
    <motion.div
      className={cn('motion-keep-fade', className)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? MOTION.quick.s : duration,
        delay: reduce ? 0 : delay,
        ease: EASE_SMOOTH,
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({
  className,
  children,
  stagger = MOTION.stagger.s,
}: {
  className?: string
  children: React.ReactNode
  stagger?: number
}) {
  const reduce = useReducedMotionPreference()

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduce ? 0 : Math.min(stagger, 0.04),
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const reduce = useReducedMotionPreference()

  return (
    <motion.div
      className={cn('motion-keep-fade', className)}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: reduce ? MOTION.quick.s : MOTION.fast.s,
            ease: EASE_SMOOTH,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
