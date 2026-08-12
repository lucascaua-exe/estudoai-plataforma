import { useEffect, useId, useMemo, useState } from 'react'
import { X, ZoomIn } from 'lucide-react'
import { cn, resolveMediaUrl } from '@/lib/utils'

interface QuestionFigureProps {
  src: string
  alt?: string
  className?: string
}

export function QuestionFigure({
  src,
  alt = 'Figura da questão',
  className,
}: QuestionFigureProps) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const titleId = useId()
  const resolved = useMemo(() => resolveMediaUrl(src), [src])

  useEffect(() => {
    setFailed(false)
  }, [resolved])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (!resolved || failed) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative mt-1 block w-full overflow-hidden rounded-2xl border border-border bg-muted/30 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label="Ampliar figura da questão"
      >
        <img
          src={resolved}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="mx-auto max-h-72 w-full object-contain p-2 transition duration-200 group-hover:scale-[1.01] sm:max-h-80"
        />
        <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
          <ZoomIn className="h-3.5 w-3.5" aria-hidden />
          Ampliar
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <p id={titleId} className="sr-only">
            Figura ampliada da questão
          </p>
          <button
            type="button"
            className="absolute top-3 right-3 z-[81] inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar zoom"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <img
            src={resolved}
            alt={alt}
            referrerPolicy="no-referrer"
            className="max-h-[92vh] max-w-[96vw] cursor-zoom-out rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  )
}
