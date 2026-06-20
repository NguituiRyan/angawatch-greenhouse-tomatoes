import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SmartImageProps {
  /** one URL, or several candidates tried in order (e.g. .jpg then .png) */
  src: string | string[]
  alt?: string
  /** wrapper className (size it here) */
  className?: string
  imgClassName?: string
  /** rendered once every candidate fails / is missing */
  fallback?: ReactNode
  /** soft radial edge-fade — blends white-background cutouts into the page */
  fade?: boolean
  fit?: 'cover' | 'contain'
  loading?: 'lazy' | 'eager'
}

const FADE_MASK = 'radial-gradient(ellipse at center, #000 58%, transparent 80%)'

/**
 * <img> with graceful fallback. Accepts multiple source candidates so a
 * user-supplied photo works whether they save it as .jpg or .png; if every
 * candidate fails it renders `fallback`.
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
  const candidates = Array.isArray(src) ? src : [src]
  const [idx, setIdx] = useState(0)
  const [exhausted, setExhausted] = useState(false)

  if (exhausted && fallback !== undefined) return <>{fallback}</>
  const current = candidates[Math.min(idx, candidates.length - 1)]

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      <img
        key={current}
        src={current}
        alt={alt}
        loading={loading}
        onError={() => (idx < candidates.length - 1 ? setIdx(idx + 1) : setExhausted(true))}
        className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', imgClassName)}
        style={fade ? { WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK } : undefined}
      />
    </span>
  )
}
