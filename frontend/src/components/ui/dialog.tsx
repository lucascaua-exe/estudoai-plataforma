import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CloseIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'
import { EASE_SMOOTH, MOTION, SCALE } from '@/lib/motion'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const descId = React.useId()
  const reduce = useReducedMotionPreference()

  React.useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
        return
      }
      if (e.key !== 'Tab' || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[1px]"
            aria-label="Fechar diálogo"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduce ? MOTION.quick.s : MOTION.fast.s,
              ease: EASE_SMOOTH,
            }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            className={cn(
              'relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl',
              className,
            )}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: SCALE.large, filter: 'blur(2px)' }
            }
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: SCALE.tiny, filter: 'blur(2px)' }
            }
            transition={{
              duration: reduce ? MOTION.quick.s : MOTION.fast.s,
              ease: EASE_SMOOTH,
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                {title ? (
                  <h2 id={titleId} className="font-display text-lg font-bold text-foreground">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descId} className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
              >
                <CloseIcon className="h-4 w-4" weight="bold" aria-hidden />
              </Button>
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
