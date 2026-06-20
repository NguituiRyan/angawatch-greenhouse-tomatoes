import { useMemo } from 'react'
import { Activity, ChevronRight, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useLatest, useRisk, useTuta, useDetections } from '@/api/hooks'
import { computeDiseaseLikelihoods, type RiskLevel } from '@/lib/diseaseRisk'
import { DISEASE_TYPE_TONE } from '@/config/diseases'
import type { Greenhouse } from '@/api/types'
import { cn } from '@/lib/cn'

const BAR: Record<RiskLevel, string> = {
  high: 'from-spectrum-amber to-spectrum-red',
  watch: 'from-health to-spectrum-amber',
  low: 'from-health-light to-health-deep',
}
const TEXT: Record<RiskLevel, string> = {
  high: 'text-spectrum-red',
  watch: 'text-spectrum-amber',
  low: 'text-health-deep',
}

/**
 * Disease Likelihood Forecast — ranks the AI-predictable diseases by how likely
 * they are to occur, from live microclimate + recent scan history. Each row links
 * to its Disease Library entry.
 */
export function DiseaseForecastCard({
  greenhouse,
  onPickDisease,
}: {
  greenhouse: Greenhouse
  onPickDisease: (diseaseId: string) => void
}) {
  const { data: latest } = useLatest(greenhouse.id)
  const { data: risk } = useRisk(greenhouse.id)
  const { data: tuta } = useTuta(greenhouse.id)
  const { data: detections } = useDetections()

  const ranked = useMemo(
    () => computeDiseaseLikelihoods({ latest, risk, tuta, detections }),
    [latest, risk, tuta, detections],
  )

  return (
    <GlassCard menu>
      <div className="mb-1 flex items-center gap-2 pr-8">
        <Activity size={18} className="text-health-deep" />
        <h3 className="text-base font-semibold text-ink">Disease Likelihood Forecast</h3>
        <Pill tone="lime" className="ml-1 gap-1">
          <Sparkles size={11} /> AI
        </Pill>
      </div>
      <p className="text-xs text-sage">
        {greenhouse.name} · ranked from live sensors + recent scan history
      </p>

      {ranked.length === 0 ? (
        <div className="py-10 text-center text-sm text-sage">Awaiting sensor data…</div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {ranked.map((r, i) => (
            <li key={r.disease.id}>
              <button
                type="button"
                onClick={() => onPickDisease(r.disease.id)}
                className="group flex w-full items-center gap-3 rounded-inner bg-white/45 p-3 text-left transition hover:bg-white/80"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-xs font-bold text-ink">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{r.disease.name}</span>
                    <Pill tone={DISEASE_TYPE_TONE[r.disease.type]}>{r.disease.type}</Pill>
                    {i === 0 && r.level !== 'low' && (
                      <span className="rounded-full bg-spectrum-red/10 px-2 py-0.5 text-[10px] font-semibold text-spectrum-red">
                        Most likely
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all', BAR[r.level])}
                        style={{ width: `${Math.max(4, Math.round(r.likelihood * 100))}%` }}
                      />
                    </div>
                    <span className={cn('w-9 text-right text-xs font-bold tabular-nums', TEXT[r.level])}>
                      {Math.round(r.likelihood * 100)}%
                    </span>
                  </div>

                  {r.drivers.length > 0 && (
                    <p className="mt-1 truncate text-[11px] text-sage">{r.drivers.join(' · ')}</p>
                  )}
                </div>

                <ChevronRight size={16} className="shrink-0 text-sage transition group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-sage">
        Likelihood = live microclimate conduciveness blended with recent scan frequency. Decision
        support only — verify in the field.
      </p>
    </GlassCard>
  )
}
