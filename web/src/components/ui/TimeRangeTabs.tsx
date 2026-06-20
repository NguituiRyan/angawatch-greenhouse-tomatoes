import { cn } from '@/lib/cn'
import type { TimeRange } from '@/api/types'

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
  { value: '48h', label: '48h' },
  { value: 'week', label: 'A Week' },
  { value: 'month', label: 'A Month' },
]

/** 12h / 24h / 48h / A Week / A Month — active gets the solid lime pill. */
export function TimeRangeTabs({
  value,
  onChange,
}: {
  value: TimeRange
  onChange: (v: TimeRange) => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {OPTIONS.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-xs font-medium transition-all',
              active
                ? 'bg-lime text-white shadow-pill'
                : 'bg-white/50 text-sage hover:bg-white/80 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
