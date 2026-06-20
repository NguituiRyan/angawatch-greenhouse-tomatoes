import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PaginationProps {
  label: string
  onPrev?: () => void
  onNext?: () => void
  className?: string
}

/** "‹  GH-01 / Plant name  ›" footer control. */
export function Pagination({ label, onPrev, onNext, className }: PaginationProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous"
        className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-sage transition hover:text-ink"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs font-medium text-sage">{label}</span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next"
        className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-sage transition hover:text-ink"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
