import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { DeltaPill } from './DeltaPill'

interface StatBlockProps {
  value: ReactNode
  unit?: string
  label?: ReactNode
  delta?: number
  className?: string
  size?: 'md' | 'lg'
}

/** Big bold metric number + unit + label, with an optional delta pill. */
export function StatBlock({ value, unit, label, delta, className, size = 'lg' }: StatBlockProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <div className="flex items-center gap-2 text-label font-medium text-sage">
          <span>{label}</span>
          {typeof delta === 'number' && <DeltaPill value={delta} />}
        </div>
      )}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'font-bold tracking-tight text-ink',
            size === 'lg' ? 'text-[2.25rem] leading-none' : 'text-2xl leading-none',
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-sage">{unit}</span>}
      </div>
    </div>
  )
}
