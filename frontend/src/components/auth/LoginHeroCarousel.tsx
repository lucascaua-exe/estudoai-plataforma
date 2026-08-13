import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'

export type LoginHeroSlide = {
  id: string
  src: string
  srcSet: string
  alt: string
  title: string
  caption: string
}

/** Imagens Unsplash — educação, estudo e preparação para provas. */
export const LOGIN_HERO_SLIDES: LoginHeroSlide[] = [
  {
    id: 'anotacoes',
    src: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80',
    srcSet: [
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=75 900w',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80 1400w',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=80 1800w',
    ].join(', '),
    alt: 'Pessoa escrevendo anotações durante a preparação para prova',
    title: 'Estude com o ritmo de quem vai passar.',
    caption: 'Banco oficial e revisão inteligente para o seu edital.',
  },
  {
    id: 'biblioteca',
    src: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80',
    srcSet: [
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=75 900w',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80 1400w',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1800&q=80 1800w',
    ].join(', '),
    alt: 'Prateleiras de livros em biblioteca acadêmica',
    title: 'Conteúdo que molda a disciplina.',
    caption: 'Teoria, questões e simulados alinhados ao material oficial.',
  },
  {
    id: 'foco',
    src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80',
    srcSet: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=75 900w',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80 1400w',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80 1800w',
    ].join(', '),
    alt: 'Ambiente de aprendizado com foco em preparação',
    title: 'Foco no que cai na prova.',
    caption: 'Menos ruído, mais prática com métricas que mostram evolução.',
  },
  {
    id: 'caderno',
    src: 'https://images.unsplash.com/photo-1488190211105-78b9ad77c77d?auto=format&fit=crop&w=1600&q=80',
    srcSet: [
      'https://images.unsplash.com/photo-1488190211105-78b9ad77c77d?auto=format&fit=crop&w=900&q=75 900w',
      'https://images.unsplash.com/photo-1488190211105-78b9ad77c77d?auto=format&fit=crop&w=1400&q=80 1400w',
      'https://images.unsplash.com/photo-1488190211105-78b9ad77c77d?auto=format&fit=crop&w=1800&q=80 1800w',
    ].join(', '),
    alt: 'Laptop e caderno em mesa de estudos',
    title: 'Sua rotina de aprovação, em um só lugar.',
    caption: 'XP, streak e revisão espaçada para manter constância.',
  },
  {
    id: 'grupo',
    src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
    srcSet: [
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=75 900w',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80 1400w',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=80 1800w',
    ].join(', '),
    alt: 'Grupo de estudantes colaborando em ambiente acadêmico',
    title: 'Treine sob pressão, com clareza.',
    caption: 'Competições e simulados para acelerar o aprendizado.',
  },
]

type LoginHeroCarouselProps = {
  className?: string
  variant?: 'compact' | 'full'
  slides?: LoginHeroSlide[]
}

export function LoginHeroCarousel({
  className,
  variant = 'full',
  slides = LOGIN_HERO_SLIDES,
}: LoginHeroCarouselProps) {
  const reducedMotion = useReducedMotionPreference()
  const [selected, setSelected] = useState(0)

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: reducedMotion ? 0 : 32 },
    reducedMotion
      ? []
      : [Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })],
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelected(emblaApi.selectedScrollSnap())
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

  const active = slides[selected] ?? slides[0]

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-[#0B1424]', className)}
      aria-roledescription="carrossel"
      aria-label="Imagens de estudo e preparação para concursos"
    >
      <div className="h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {slides.map((slide, index) => (
            <div key={slide.id} className="relative min-w-0 shrink-0 grow-0 basis-full">
              <img
                src={slide.src}
                srcSet={slide.srcSet}
                sizes={
                  variant === 'compact'
                    ? '100vw'
                    : '(min-width: 1024px) calc(100vw - 28rem), 100vw'
                }
                width={1800}
                height={1200}
                alt={slide.alt}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          variant === 'compact'
            ? 'bg-gradient-to-b from-black/25 via-transparent to-background'
            : 'bg-gradient-to-t from-black/75 via-black/25 to-black/10',
        )}
        aria-hidden
      />

      {variant === 'full' && active ? (
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={
                reducedMotion
                  ? { duration: 0.2 }
                  : { type: 'spring', bounce: 0, duration: 0.4 }
              }
            >
              <p className="max-w-md font-display text-[1.85rem] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-white xl:text-[2.15rem]">
                {active.title}
              </p>
              <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed tracking-[-0.01em] text-white/80">
                {active.caption}
              </p>
            </motion.div>
          </AnimatePresence>

          <div
            className="mt-7 flex items-center gap-2"
            role="tablist"
            aria-label="Slides do carrossel"
          >
            {slides.map((slide, index) => {
              const activeDot = index === selected
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={activeDot}
                  aria-label={`Imagem ${index + 1}`}
                  className="group flex h-11 min-w-11 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  onPointerDown={() => emblaApi?.scrollTo(index)}
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out',
                      activeDot
                        ? 'w-7 bg-white'
                        : 'w-1.5 bg-white/40 group-hover:bg-white/65 group-active:scale-95',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
