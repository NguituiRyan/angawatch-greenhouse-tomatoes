import { ScanLine, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useDetections } from '@/api/hooks'
import { DISEASES } from '@/config/diseases'
import type { Severity } from '@/api/types'

const sevTone: Record<Severity, 'lime' | 'amber' | 'red' | 'neutral'> = {
  none: 'lime',
  low: 'lime',
  moderate: 'amber',
  high: 'red',
}

/** Recent AI leaf detections. Each detection links to its Disease Library entry. */
export function LeafDetectionsFeed({
  onPickDisease,
}: {
  onPickDisease?: (diseaseId: string) => void
}) {
  const { data } = useDetections()

  return (
    <GlassCard menu className="flex flex-col">
      <div className="mb-3 flex items-center gap-2 pr-8">
        <ScanLine size={18} className="text-health-deep" />
        <h3 className="text-base font-semibold text-ink">AI leaf detections</h3>
      </div>

      <ul className="scroll-slim flex max-h-[320px] flex-col divide-y divide-white/50 overflow-y-auto">
        {(data ?? []).map((d) => {
          const di = DISEASES.find((x) => x.aiClass === d.disease)
          const clickable = !!(di && onPickDisease)
          const inner = (
            <>
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-inner text-xs font-bold ${
                  d.is_healthy ? 'bg-lime-tint text-health-deep' : 'bg-spectrum-red/10 text-spectrum-red'
                }`}
              >
                {Math.round(d.health_score)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-ink">{d.disease_label}</div>
                <div className="text-[11px] text-sage">
                  {d.greenhouseId} · {Math.round(d.confidence * 100)}% conf · {d.scanned_at.slice(11, 16)}
                </div>
              </div>
              <Pill tone={sevTone[d.severity]} className="capitalize">
                {d.severity === 'none' ? 'healthy' : d.severity}
              </Pill>
              {clickable && <ChevronRight size={15} className="shrink-0 text-sage" />}
            </>
          )
          return (
            <li key={d.id}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onPickDisease!(di!.id)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-75"
                  title={`View ${di!.name} in the Disease Library`}
                >
                  {inner}
                </button>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{inner}</div>
              )}
            </li>
          )
        })}
        {(!data || data.length === 0) && (
          <li className="py-6 text-center text-sm text-sage">No scans yet.</li>
        )}
      </ul>
    </GlassCard>
  )
}
