import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** accepted for back-compat; the decorative overflow menu was removed */
  menu?: boolean
  onMenu?: () => void
  padding?: 'sm' | 'md' | 'lg'
  as?: 'div' | 'section'
}

const pad = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

/** Signature liquid-glass surface: a blurred "bend" backdrop under sheened, content. */
export function GlassCard({ children, className, padding = 'md', as: Tag = 'div' }: GlassCardProps) {
  return (
    <Tag className={cn('liquid-glass card-hover rounded-card', pad[padding], className)}>
      <span aria-hidden className="lg-bend" />
      <div className="relative z-30">{children}</div>
    </Tag>
  )
}
