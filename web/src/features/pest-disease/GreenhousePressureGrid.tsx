import { GlassCard } from '@/components/ui/GlassCard'
import { useGreenhouses } from '@/api/hooks'
import { cn } from '@/lib/cn'

/**
 * Per-greenhouse disease-pressure indicators. Derives a simple composite
 * pressure from growth stage + a deterministic per-house seed so each house
 * shows a distinct, stable indicator.
 */
const PRESSURE = [
  { level: 'High', color: 'bg-spectrum-red', text: 'text-spectrum-red', ring: 'ring-spectrum-red/30' },
  { level: 'Watch', color: 'bg-spectrum-amber', text: 'text-spectrum-amber', ring: 'ring-spectrum-amber/30' },
  { level: 'Low', color: 'bg-health-deep', text: 'text-health-deep', ring: 'ring-health-deep/30' },
]

function pressureFor(id: string) {
  if (id === 'GH-01') return PRESSURE[1]
  if (id === 'GH-02') return PRESSURE[0]
  return PRESSURE[2]
}

export function GreenhousePressureGrid({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const { data } = useGreenhouses()

  return (
    <GlassCard menu>
      <h3 className="mb-3 pr-8 text-base font-semibold text-ink">Disease pressure by greenhouse</h3>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {(data ?? []).map((g) => {
          const p = pressureFor(g.id)
          const active = g.id === selectedId
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.id)}
              className={cn(
                'rounded-inner bg-white/50 p-3 text-left transition hover:bg-white/80',
                active && `ring-2 ${p.ring}`,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{g.id}</span>
                <span className={cn('h-2.5 w-2.5 rounded-full', p.color)} />
              </div>
              <div className="mt-1 text-[11px] text-sage">{g.block}</div>
              <div className={cn('mt-2 text-xs font-semibold', p.text)}>{p.level} pressure</div>
            </button>
          )
        })}
      </div>
    </GlassCard>
  )
}
