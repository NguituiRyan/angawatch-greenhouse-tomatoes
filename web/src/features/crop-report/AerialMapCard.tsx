import { Sprout, Wheat, Warehouse } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { IconStat } from '@/components/ui/IconStat'
import { AerialMap } from '@/components/illustrations/AerialMap'
import { UserCard } from './UserCard'
import { useStats, useAgronomist } from '@/api/hooks'
import type { Greenhouse } from '@/api/types'

/** Farm overview: aerial greenhouse cluster + key stats + agronomist mini-card. */
export function AerialMapCard({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data: stats } = useStats()
  const { data: person } = useAgronomist(greenhouse.id)

  return (
    <GlassCard menu padding="md">
      <h2 className="mb-3 pr-8 text-base font-semibold text-ink">{greenhouse.farm}</h2>

      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="h-[150px] overflow-hidden rounded-inner ring-1 ring-white/60">
          <AerialMap />
        </div>

        <div className="flex flex-col justify-between gap-3 py-1">
          <IconStat icon={Sprout} label="Total Plants" value={(stats?.totalPlants ?? 3256).toLocaleString()} />
          <IconStat
            icon={Wheat}
            label="Projected Harvest"
            value={`${((stats?.projectedHarvestKg ?? 13530) / 1000).toFixed(2)} t`}
          />
          <IconStat icon={Warehouse} label="Active Houses" value={stats?.activeGreenhouses ?? 3} />
        </div>
      </div>

      {person && (
        <div className="mt-4">
          <UserCard person={person} />
        </div>
      )}
    </GlassCard>
  )
}
