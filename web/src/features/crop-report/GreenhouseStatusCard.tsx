import { Thermometer, Droplets, Wind, Waves, Sun, CloudRain, Bug, type LucideIcon } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useLatest, useRisk, useLight, useTuta } from '@/api/hooks'
import { buildGreenhouseStatus, type StatusLevel, type StatusIcon } from '@/lib/greenhouseStatus'
import type { Greenhouse } from '@/api/types'
import { cn } from '@/lib/cn'

const ICONS: Record<StatusIcon, LucideIcon> = {
  temp: Thermometer,
  humidity: Droplets,
  vpd: Wind,
  soil: Waves,
  light: Sun,
  blight: CloudRain,
  tuta: Bug,
}

const LEVEL_DOT: Record<StatusLevel, string> = {
  good: 'bg-health-deep/12 text-health-deep',
  watch: 'bg-spectrum-amber/15 text-spectrum-amber',
  alert: 'bg-spectrum-red/12 text-spectrum-red',
}
const VALUE_COLOR: Record<StatusLevel, string> = {
  good: 'text-health-deep',
  watch: 'text-spectrum-amber',
  alert: 'text-spectrum-red',
}

/**
 * "Right now in your greenhouse" — every live reading translated into a plain
 * verdict + the action to take. Urgent items first. This is the dashboard's
 * answer to "what's happening and what should I do about it?".
 */
export function GreenhouseStatusCard({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data: latest } = useLatest(greenhouse.id)
  const { data: risk } = useRisk(greenhouse.id)
  const { data: light } = useLight(greenhouse.id)
  const { data: tuta } = useTuta(greenhouse.id)

  const items = buildGreenhouseStatus({ latest, risk, light, tuta })
  const alerts = items.filter((i) => i.level === 'alert').length
  const watches = items.filter((i) => i.level === 'watch').length

  const summary =
    alerts > 0
      ? { text: `${alerts} need${alerts === 1 ? 's' : ''} action`, cls: 'bg-spectrum-red/12 text-spectrum-red' }
      : watches > 0
        ? { text: `${watches} to watch`, cls: 'bg-spectrum-amber/15 text-spectrum-amber' }
        : { text: 'All conditions ideal', cls: 'bg-health-deep/12 text-health-deep' }

  return (
    <GlassCard padding="md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Right now in {greenhouse.id}</h2>
          <p className="text-[11px] text-sage">Live readings, in plain language</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', summary.cls)}>
          {summary.text}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = ICONS[item.icon]
          return (
            <li key={item.id} className="flex items-start gap-3 rounded-inner bg-white/45 p-2.5">
              <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', LEVEL_DOT[item.level])}>
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                  <span className={cn('text-sm font-bold tabular-nums', VALUE_COLOR[item.level])}>{item.value}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-sage">{item.message}</p>
              </div>
            </li>
          )
        })}
        {items.length === 0 && (
          <li className="py-6 text-center text-sm text-sage">Waiting for sensor data…</li>
        )}
      </ul>
    </GlassCard>
  )
}
