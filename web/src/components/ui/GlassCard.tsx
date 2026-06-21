import { type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** show the "•••" overflow menu button top-right */
  menu?: boolean
  onMenu?: () => void
  /** tighter padding for dense cards */
  padding?: 'sm' | 'md' | 'lg'
  as?: 'div' | 'section'
}

const pad = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

/** The signature frosted-glass surface used across the whole dashboard. */
export function GlassCard({
  children,
  className,
  menu,
  onMenu,
  padding = 'md',
  as: Tag = 'div',
}: GlassCardProps) {
  return (
    <Tag className={cn('glass card-hover rounded-card relative', pad[padding], className)}>
      {menu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label="More options"
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full text-sage transition hover:bg-black/5 hover:text-ink"
        >
          <MoreHorizontal size={18} />
        </button>
      )}
      {children}
    </Tag>
  )
}
