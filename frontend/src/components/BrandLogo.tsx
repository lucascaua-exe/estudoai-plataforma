import { cn } from '@/lib/utils'
import { BRAND_FULL, BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_NAME } from '@/lib/brand'

type BrandLogoProps = {
  className?: string
  /** Altura aproximada do bloco da logo */
  size?: 'sm' | 'md' | 'lg' | 'hero'
  /**
   * auto — troca com o tema (claro/escuro)
   * light — versão azul (tema claro)
   * dark — versão branca/preta (tema escuro)
   */
  variant?: 'auto' | 'light' | 'dark'
  /** Só a marca curta no alt */
  compact?: boolean
}

const HEIGHT: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'h-9',
  md: 'h-12',
  lg: 'h-16',
  hero: 'h-28 sm:h-36 md:h-44',
}

function LogoImg({
  src,
  alt,
  className,
  hidden,
}: {
  src: string
  alt: string
  className?: string
  hidden?: boolean
}) {
  return (
    <img
      src={src}
      alt={alt}
      translate="no"
      draggable={false}
      className={cn(
        'block h-full w-auto max-w-full select-none object-contain object-center',
        hidden && 'hidden',
        className,
      )}
    />
  )
}

export function BrandLogo({
  className,
  size = 'md',
  variant = 'auto',
  compact = false,
}: BrandLogoProps) {
  const alt = compact ? BRAND_NAME : BRAND_FULL
  const box = cn('inline-flex items-center justify-center', HEIGHT[size], className)

  if (variant === 'light') {
    return (
      <span className={box}>
        <LogoImg src={BRAND_LOGO_LIGHT} alt={alt} />
      </span>
    )
  }
  if (variant === 'dark') {
    return (
      <span className={box}>
        <LogoImg src={BRAND_LOGO_DARK} alt={alt} />
      </span>
    )
  }

  return (
    <span className={box}>
      <LogoImg src={BRAND_LOGO_LIGHT} alt={alt} className="dark:hidden" />
      <LogoImg src={BRAND_LOGO_DARK} alt="" className="hidden dark:block" />
    </span>
  )
}
