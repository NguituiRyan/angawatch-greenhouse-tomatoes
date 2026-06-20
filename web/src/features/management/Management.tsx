import { Construction } from 'lucide-react'
import { GreenhouseRow } from './GreenhouseRow'
import { useGreenhouses } from '@/api/hooks'

/**
 * Management — scaffolded view. Lists greenhouses with live microclimate tiles
 * and growth-stage context. Full fleet management (irrigation schedules, crews,
 * fertigation recipes, M-Pesa billing) is stubbed — see NOTES.md.
 */
export function Management({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const { data } = useGreenhouses()

  return (
    <div className="flex flex-col gap-5">
      <div className="glass flex items-center gap-3 rounded-card px-5 py-3 text-sm text-sage">
        <Construction size={18} className="text-spectrum-amber" />
        <span>
          <span className="font-semibold text-ink">Management is scaffolded.</span> Live microclimate
          per greenhouse is wired; scheduling, crews, fertigation recipes and M-Pesa billing are stubbed.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(data ?? []).map((g) => (
          <GreenhouseRow
            key={g.id}
            greenhouse={g}
            selected={g.id === selectedId}
            onSelect={() => onSelect(g.id)}
          />
        ))}
      </div>
    </div>
  )
}
