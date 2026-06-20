import { Thermometer, Droplets, Waves, Gauge } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useLatest } from '@/api/hooks'
import { TOMATO_OPTIMA } from '@/config/tomato'
import type { Greenhouse } from '@/api/types'
import { cn } from '@/lib/cn'

function within(v: number, r: { min: number; max: number }) {
  return v >= r.min && v <= r.max
}

/** One greenhouse row with live microclimate tiles (Management view). */
export function GreenhouseRow({
  greenhouse,
  selected,
  onSelect,
}: {
  greenhouse: Greenhouse
  selected: boolean
  onSelect: () => void
}) {
  const { data } = useLatest(greenhouse.id)

  const tiles = [
    {
      icon: Thermometer,
      label: 'Air temp',
      value: data ? `${data.airTempC}°C` : '—',
      ok: data ? within(data.airTempC, TOMATO_OPTIMA.airTempDayC) : true,
    },
    {
      icon: Droplets,
      label: 'Humidity',
      value: data ? `${data.relativeHumidityPct}%` : '—',
      ok: data ? within(data.relativeHumidityPct, TOMATO_OPTIMA.relativeHumidityPct) : true,
    },
    {
      icon: Waves,
      label: 'Soil moist.',
      value: data ? `${data.soilMoisturePct}%` : '—',
      ok: data ? within(data.soilMoisturePct, TOMATO_OPTIMA.soilMoisturePct) : true,
    },
    {
      icon: Gauge,
      label: 'EC',
      value: data ? `${data.ecDsPerM}` : '—',
      ok: data ? within(data.ecDsPerM, TOMATO_OPTIMA.fertigationEcDsPerM) : true,
    },
  ]

  return (
    <GlassCard
      padding="md"
      className={cn('cursor-pointer transition hover:shadow-glass-lg', selected && 'ring-2 ring-lime/40')}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-ink">{greenhouse.name}</div>
            <div className="text-[11px] text-sage">
              {greenhouse.block} · {greenhouse.cropVariety}
            </div>
          </div>
          <Pill tone="lime">{data?.inOptimalRangePct ?? 97}% in range</Pill>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-inner bg-white/45 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-sage">
                <t.icon size={13} />
                {t.label}
              </div>
              <div className={cn('mt-1 text-base font-bold', t.ok ? 'text-ink' : 'text-spectrum-red')}>
                {t.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-sage">
          <span className="rounded-full bg-white/60 px-2 py-0.5 font-medium capitalize">
            {greenhouse.growthStage}
          </span>
          <span>Day {greenhouse.daysFromTransplant} from transplant</span>
          <span className="ml-auto">{greenhouse.plantCount.toLocaleString()} plants</span>
        </div>
      </button>
    </GlassCard>
  )
}
