import { cn } from '@/lib/cn'

type DotLevel = 'low' | 'ok' | 'high' | 'empty'

const dotColor: Record<DotLevel, string> = {
  low: 'bg-dot-orange',
  ok: 'bg-dot-green',
  high: 'bg-health-deep',
  empty: 'bg-dot-grey',
}

interface DottedActivityRowProps {
  /** groups of dots; each group is one day's light intensity */
  groups: { level: DotLevel; filled: number; total?: number }[]
  className?: string
}

/** The multi-colour dot/square activity strip (daily light per day). */
export function DottedActivityRow({ groups, className }: DottedActivityRowProps) {
  return (
    <div className={cn('flex items-end gap-2.5', className)}>
      {groups.map((g, gi) => {
        const total = g.total ?? 4
        return (
          <div key={gi} className="flex flex-col-reverse gap-1">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-2 w-2 rounded-[3px] transition-colors',
                  i < g.filled ? dotColor[g.level] : dotColor.empty,
                )}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
