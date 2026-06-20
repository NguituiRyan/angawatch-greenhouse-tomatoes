import { Bug } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useTuta } from '@/api/hooks'
import type { Greenhouse, RiskLevel } from '@/api/types'

const pressureTone: Record<RiskLevel, 'lime' | 'amber' | 'red'> = {
  low: 'lime',
  watch: 'amber',
  high: 'red',
}

/**
 * Tuta absoluta tracker — pheromone-trap count trend + a degree-day generation
 * progress meter, with the spray-window status.
 */
export function TutaTrackerCard({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data } = useTuta(greenhouse.id)
  const series = data?.trapCounts ?? []

  return (
    <GlassCard menu className="flex flex-col">
      <div className="mb-1 flex items-center gap-2 pr-8">
        <Bug size={18} className="text-spectrum-amber" />
        <h3 className="text-base font-semibold text-ink">Tuta absoluta tracker</h3>
        <Pill tone={pressureTone[data?.pressure ?? 'low']} className="ml-auto capitalize">
          {data?.pressure ?? 'low'} pressure
        </Pill>
      </div>
      <p className="text-xs text-sage">Pheromone-trap trend · moths per trap</p>

      <div className="mt-3 h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="tuta-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--c-spectrum-amber)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--c-spectrum-amber)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8C9389' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8C9389' }} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.6)', fontSize: 12 }}
              labelStyle={{ color: '#1F2A24', fontWeight: 600 }}
            />
            {data?.trapThreshold != null && (
              <ReferenceLine y={data.trapThreshold} stroke="var(--c-spectrum-red)" strokeDasharray="4 4" strokeOpacity={0.7} />
            )}
            <Area type="monotone" dataKey="count" stroke="var(--c-spectrum-amber)" strokeWidth={2.5} fill="url(#tuta-fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 rounded-inner bg-white/45 p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-sage">
            Generation {data?.currentGeneration ?? 1} · degree-day model
          </span>
          <span className="font-semibold text-ink">
            {data?.degreeDaysAccumulated ?? 0} / {data?.degreeDaysPerGeneration ?? 450} DD
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-health to-spectrum-amber transition-all"
            style={{ width: `${data?.generationProgressPct ?? 0}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-inner bg-lime-tint/60 p-3">
        <span
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${data?.sprayWindowOpen ? 'bg-spectrum-red' : 'bg-health-deep'}`}
        />
        <p className="text-xs font-medium text-ink">{data?.note ?? 'Keep monitoring traps.'}</p>
      </div>
    </GlassCard>
  )
}
