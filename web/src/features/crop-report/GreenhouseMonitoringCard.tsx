import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { TimeRangeTabs } from '@/components/ui/TimeRangeTabs'
import { SpectrumBar } from '@/components/ui/SpectrumBar'
import { DeltaPill } from '@/components/ui/DeltaPill'
import { useSuitability } from '@/api/hooks'
import type { Greenhouse, TimeRange } from '@/api/types'

/**
 * "Greenhouse Monitoring" — the Climate Suitability Index per hour.
 * Bars go green when temp 21–27°C, RH 65–75% and soil moisture are in band;
 * red when out-of-range or disease-conducive.
 */
export function GreenhouseMonitoringCard({ greenhouse }: { greenhouse: Greenhouse }) {
  const [range, setRange] = useState<TimeRange>('12h')
  const { data, isLoading } = useSuitability(greenhouse.id, range)

  const values = data?.points.map((p) => p.score) ?? Array(12).fill(0.5)

  return (
    <GlassCard menu>
      <div className="mb-4 flex items-center justify-between pr-8">
        <h2 className="text-base font-semibold text-ink">Greenhouse Monitoring</h2>
      </div>

      <TimeRangeTabs value={range} onChange={setRange} />

      <div className="mt-5 flex items-center gap-2.5">
        <h3 className="text-2xl font-bold tracking-tight text-ink">
          {greenhouse.id} · {greenhouse.block}
        </h3>
        <DeltaPill value={data?.deltaPct ?? 15} />
      </div>

      <div className="mt-3">
        <SpectrumBar values={values} height={56} className={isLoading ? 'animate-pulse opacity-60' : ''} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/50 pt-3">
        <span className="text-sm text-sage">In optimal range</span>
        <span className="text-sm font-semibold text-ink">{data?.inOptimalPct ?? 97}% today</span>
      </div>
    </GlassCard>
  )
}
