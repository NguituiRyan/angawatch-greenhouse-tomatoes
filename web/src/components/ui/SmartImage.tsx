import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SmartImageProps {
  src: string
  alt?: string
  /** wrapper className (size it here) */
  className?: string
  imgClassName?: string
  /** rendered if the image is missing / fails to load */
  fallback?: ReactNode
  /** soft radial edge-fade — blends white-background cutouts into the page */
  fade?: boolean
  fit?: 'cover' | 'contain'
  loading?: 'lazy' | 'eager'
}

const FADE_MASK = 'radial-gradient(ellipse at center, #000 58%, transparent 80%)'

/**
 * <img> with a graceful fallback. Lets us wire real photos (the user drops files
 * into web/public/images/) while keeping the UI intact before the files exist.
 */
export function SmartImage({
  src,
  alt = '',
  className,
  imgClassName,
  fallback,
  fade,
  fit = 'cover',
  loading = 'lazy',
}: SmartImageProps) {
  const [errored, setErrored] = useState(false)

  if (errored && fallback !== undefined) return <>{fallback}</>

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setErrored(true)}
        className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', imgClassName)}
        style={fade ? { WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK } : undefined}
      />
    </span>
  )
}
