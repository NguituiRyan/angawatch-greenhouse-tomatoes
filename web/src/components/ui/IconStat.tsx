import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface IconStatProps {
  icon: LucideIcon
  label: string
  value: string | number
  className?: string
}

/** icon + small muted label stacked over a bold value (aerial-card stat list). */
export function IconStat({ icon: Icon, label, value, className }: IconStatProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-sage">
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <div className="text-label text-sage">{label}</div>
        <div className="text-lg font-bold leading-tight text-ink">{value}</div>
      </div>
    </div>
  )
}
