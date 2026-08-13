import { cn } from '@/lib/utils'
import { BRAND_FULL, BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_NAME } from '@/lib/brand'

type BrandLogoProps = {
  className?: string
  /** Altura aproximada do bloco da logo */
  size?: 'sm' | 'md' | 'lg' | 'hero'
  /**
   * auto — troca com o tema (claro/escuro)
   * light — versão azul (tema claro)
   * dark — versão branca (tema escuro / sidebar azul)
   */
  variant?: 'auto' | 'light' | 'dark'
  /** Só a marca curta no alt */
  compact?: boolean
}

const HEIGHT: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'h-11',
  md: 'h-16',
  lg: 'h-24 sm:h-28',
  hero: 'h-40 sm:h-48 md:h-56',
}

function LogoImg({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      translate="no"
      draggable={false}
      className={cn(
        'block h-full w-auto max-w-full select-none object-contain object-center',
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
  const box = cn(
    'inline-flex items-center justify-center',
    HEIGHT[size],
    className,
  )

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
