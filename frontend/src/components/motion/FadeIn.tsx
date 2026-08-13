import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

type FadeInProps = HTMLMotionProps<'div'> & {
  delay?: number
  y?: number
  duration?: number
}

export function FadeIn({
  className,
  delay = 0,
  y = 12,
  duration = 0.4,
  children,
  ...props
}: FadeInProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : duration,
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
  stagger = 0.05,
}: {
  className?: string
  children: React.ReactNode
  stagger?: number
}) {
  const reduce = useReducedMotion()

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
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
