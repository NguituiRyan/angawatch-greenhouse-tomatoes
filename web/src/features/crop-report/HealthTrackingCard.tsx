import { GlassCard } from '@/components/ui/GlassCard'
import { SmartImage } from '@/components/ui/SmartImage'
import { AIInsightsPill } from '@/components/ui/AIInsightsPill'
import { StatBlock } from '@/components/ui/StatBlock'
import { DottedActivityRow } from '@/components/ui/DottedActivityRow'
import { Pagination } from '@/components/ui/Pagination'
import { useLight } from '@/api/hooks'
import type { Greenhouse } from '@/api/types'

/**
 * "Health Tracking" — projected yield uplift + the DLI / light-hours progress
 * toward the weekly Daily Light Integral target. The dotted row is daily light.
 */
export function HealthTrackingCard({
  greenhouse,
  onInsights,
}: {
  greenhouse: Greenhouse
  onInsights?: () => void
}) {
  const { data } = useLight(greenhouse.id)

  const groups =
    data?.daily.map((d) => ({
      level: d.level === 'low' ? ('low' as const) : d.level === 'high' ? ('high' as const) : ('ok' as const),
      filled: d.level === 'low' ? 1 : d.level === 'high' ? 4 : 3,
      total: 4,
    })) ?? []

  return (
    <GlassCard menu className="relative overflow-hidden">
      {/* cherry-tomato accent (add web/public/images/cherry-tomatoes.png) */}
      <SmartImage
        src="/images/cherry-tomatoes.jpg"
        alt=""
        fade
        fallback={null}
        className="pointer-events-none absolute -bottom-2 right-0 z-0 h-28 w-40 opacity-95"
      />
      <h2 className="relative z-10 mb-3 pr-8 text-base font-semibold text-ink">Health Tracking</h2>

      <div className="flex items-center justify-between gap-2 rounded-inner bg-white/45 px-3 py-2.5">
        <span className="text-sm font-medium text-ink">
          {data?.projectedYieldUpliftPct?.toFixed(2) ?? '14.97'}% projected yield uplift
        </span>
        <AIInsightsPill onClick={onInsights} />
      </div>

      <div className="relative z-10 mt-5">
        <StatBlock
          label="Light / DLI"
          delta={data?.deltaPct ?? 80}
          value={data?.hoursAccumulated ?? 139}
          unit={`h of ${data?.hoursTarget ?? 160}h`}
        />
        <p className="mt-1 text-[11px] text-sage">
          Daily Light Integral · target {data?.dliTargetMol ?? 26} mol/m²/day
        </p>

        <DottedActivityRow groups={groups} className="mt-4" />
      </div>

      <Pagination
        label={`${greenhouse.name} · ${greenhouse.cropVariety}`}
        className="relative z-10 mt-6 border-t border-white/50 pt-4"
      />
    </GlassCard>
  )
}
