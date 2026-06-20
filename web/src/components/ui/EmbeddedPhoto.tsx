import { cn } from '@/lib/cn'

interface EmbeddedPhotoProps {
  src: string
  alt?: string
  className?: string
  /** corner the photo bleeds into */
  corner?: 'br' | 'bl' | 'tr' | 'tl'
}

/** A plant/leaf photo that bleeds into a card corner with a soft fade. */
export function EmbeddedPhoto({ src, alt = '', className, corner = 'br' }: EmbeddedPhotoProps) {
  const pos = {
    br: 'bottom-0 right-0',
    bl: 'bottom-0 left-0',
    tr: 'top-0 right-0',
    tl: 'top-0 left-0',
  }[corner]
  return (
    <div className={cn('pointer-events-none absolute overflow-hidden', pos, className)}>
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/10 to-white/60" />
    </div>
  )
}
