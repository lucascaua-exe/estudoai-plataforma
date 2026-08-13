import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type HorizontalCarouselProps = {
  children: React.ReactNode
  className?: string
  label?: string
}

/** Carrossel horizontal (mobile-friendly) com Embla. */
export function HorizontalCarousel({ children, className, label }: HorizontalCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
  })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className={cn('relative', className)} aria-label={label}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">{children}</div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 bg-gradient-to-l from-background to-transparent sm:block" />
      <div className="mt-2 flex justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Anterior"
          disabled={!canPrev}
          onClick={() => emblaApi?.scrollPrev()}
        >
          <ChevronLeftIcon className="h-4 w-4" weight="bold" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Próximo"
          disabled={!canNext}
          onClick={() => emblaApi?.scrollNext()}
        >
          <ChevronRightIcon className="h-4 w-4" weight="bold" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
