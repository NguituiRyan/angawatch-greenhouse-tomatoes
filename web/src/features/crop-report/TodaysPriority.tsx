import { Thermometer, Droplets, Wind, Waves, Sun, CloudRain, Bug, CheckCircle2, type LucideIcon } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useLatest, useRisk, useLight, useTuta } from '@/api/hooks'
import { buildGreenhouseStatus, type StatusIcon } from '@/lib/greenhouseStatus'
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

/** The single most important thing to do in this greenhouse right now. */
export function TodaysPriority({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data: latest } = useLatest(greenhouse.id)
  const { data: risk } = useRisk(greenhouse.id)
  const { data: light } = useLight(greenhouse.id)
  const { data: tuta } = useTuta(greenhouse.id)

  const items = buildGreenhouseStatus({ latest, risk, light, tuta })
  const top = items[0]
  const urgent = top && top.level !== 'good'
  const Icon = top ? ICONS[top.icon] : CheckCircle2

  const tone = !urgent
    ? 'bg-health-deep/10 text-health-deep'
    : top.level === 'alert'
      ? 'bg-spectrum-red/12 text-spectrum-red'
      : 'bg-spectrum-amber/15 text-spectrum-amber'

  return (
    <GlassCard padding="md">
      <div className="flex items-center gap-3">
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', tone)}>
          {urgent ? <Icon size={20} strokeWidth={1.9} /> : <CheckCircle2 size={20} />}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">
            {urgent ? 'Top priority now' : 'Greenhouse status'}
          </div>
          <p className="text-sm font-medium leading-snug text-ink">
            {urgent ? top.message : 'All conditions are in the ideal range — keep up the good work.'}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
