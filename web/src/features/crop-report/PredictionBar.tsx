import { Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { SpectrumBar } from '@/components/ui/SpectrumBar'
import { usePlantingSuitability, useSuitability } from '@/api/hooks'
import type { Greenhouse } from '@/api/types'

/** "Area prediction model — Good for planting" suitability strip. */
export function PredictionBar({ greenhouse }: { greenhouse: Greenhouse }) {
  const { data } = usePlantingSuitability(greenhouse.id)
  const { data: series } = useSuitability(greenhouse.id, '24h')
  const values = series?.points.map((p) => p.score) ?? Array(24).fill(0.6)

  return (
    <GlassCard padding="md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Area prediction model</h3>
        <span className="text-sm font-medium text-health-deep">{data?.verdict ?? 'Good for planting'}</span>
      </div>

      <SpectrumBar values={values} height={40} />

      <div className="mt-3 flex items-center gap-2 text-xs text-sage">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 font-medium text-ink">
          <Loader2 size={12} className="animate-spin" />
          Checking…
        </span>
        {data?.status ?? 'AI is scanning every part of the plant'}
      </div>
    </GlassCard>
  )
}
