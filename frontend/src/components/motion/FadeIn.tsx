import { motion, type HTMLMotionProps } from 'motion/react'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

type FadeInProps = HTMLMotionProps<'div'> & {
  delay?: number
  /** Deslocamento vertical (Tier 2 → removido quando reduce). */
  y?: number
  duration?: number
}

/**
 * Entrada acessível:
 * - motion OK: fade + leve slide (Tier 2)
 * - reduce: só fade curto (Tier 3), sem translate
 */
export function FadeIn({
  className,
  delay = 0,
  y = 10,
  duration = 0.4,
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
        duration: reduce ? 0.15 : duration,
        delay: reduce ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
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
  stagger = 0.04,
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
            staggerChildren: reduce ? 0 : stagger,
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
            duration: reduce ? 0.15 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
