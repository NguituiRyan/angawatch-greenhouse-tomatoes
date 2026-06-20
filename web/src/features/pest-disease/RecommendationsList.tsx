import { Wind, Droplets, SprayCan, FlaskConical, Search } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useRecommendations } from '@/api/hooks'
import type { Greenhouse, Recommendation } from '@/api/types'
import { cn } from '@/lib/cn'

const KIND_ICON: Record<Recommendation['kind'], typeof Wind> = {
  ventilate: Wind,
  irrigate: Droplets,
  spray: SprayCan,
  nutrient: FlaskConical,
  scout: Search,
}
const PRIORITY: Record<Recommendation['priority'], string> = {
  high: 'bg-spectrum-red/10 text-spectrum-red',
  medium: 'bg-spectrum-amber/15 text-spectrum-amber',
  low: 'bg-lime-tint text-health-deep',
}

/** Active recommendations (vent / irrigate / spray window / nutrient). */
export function RecommendationsList({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data } = useRecommendations(greenhouse.id)

  return (
    <GlassCard menu className="flex flex-col">
      <h3 className="mb-3 pr-8 text-base font-semibold text-ink">Active recommendations</h3>
      <ul className="flex flex-col gap-2.5">
        {(data ?? []).map((r) => {
          const Icon = KIND_ICON[r.kind]
          return (
            <li key={r.id} className="flex items-start gap-3 rounded-inner bg-white/45 p-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/80 text-health-deep">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{r.title}</span>
                  <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold', PRIORITY[r.priority])}>
                    {r.dueWindow}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-sage">{r.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
