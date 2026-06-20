import { CloudRain, Wind } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { RiskGauge } from './RiskGauge'
import { useRisk } from '@/api/hooks'
import type { Greenhouse } from '@/api/types'

/**
 * Late Blight Risk — accumulates "wet hours" (RH≥90% AND 10–26°C) from the
 * microclimate model; surfaces an hours-ahead warning and the action to take.
 */
export function LateBlightCard({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data } = useRisk(greenhouse.id)
  const lb = data?.assessments.find((a) => a.key === 'late_blight')
  const wet = data?.wetHours ?? 0
  const target = data?.wetHoursToInfection ?? 10

  return (
    <GlassCard menu className="flex flex-col">
      <div className="mb-1 flex items-center gap-2 pr-8">
        <CloudRain size={18} className="text-health-deep" />
        <h3 className="text-base font-semibold text-ink">Late Blight Risk</h3>
      </div>
      <p className="text-xs text-sage">Phytophthora infestans · microclimate model</p>

      <div className="mt-2 flex flex-col items-center">
        <RiskGauge score={lb?.score ?? 0} level={lb?.level ?? 'low'} />
      </div>

      <div className="mt-3 rounded-inner bg-white/45 p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-sage">Wet-hours to infection</span>
          <span className="font-semibold text-ink">
            {wet} / {target} h
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-spectrum-amber to-spectrum-red transition-all"
            style={{ width: `${Math.min(100, (wet / target) * 100)}%` }}
          />
        </div>
        {lb?.hoursAhead != null && (
          <p className="mt-2 text-[11px] text-spectrum-red">
            Infection window in ~{lb.hoursAhead}h if conditions persist.
          </p>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-inner bg-lime-tint/60 p-3">
        <Wind size={15} className="mt-0.5 shrink-0 text-health-deep" />
        <p className="text-xs font-medium text-ink">{lb?.action ?? 'Maintain airflow; keep monitoring.'}</p>
      </div>
    </GlassCard>
  )
}
