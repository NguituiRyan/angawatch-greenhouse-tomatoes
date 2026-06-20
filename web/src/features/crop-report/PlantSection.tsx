import { Leaf, Cherry, Sprout, GitBranch } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useScanSummary } from '@/api/hooks'
import { cn } from '@/lib/cn'

/** "Plant Section" — counts of AI scans by plant part. */
export function PlantSection() {
  const { data } = useScanSummary()
  const items = [
    { icon: Leaf, label: 'Leaf scans', value: data?.leaf ?? 921, tone: 'bg-lime-tint text-health-deep' },
    { icon: Cherry, label: 'Fruit scans', value: data?.fruit ?? 142, tone: 'bg-spectrum-red/10 text-spectrum-red' },
    { icon: Sprout, label: 'Root scans', value: data?.root ?? 9, tone: 'bg-spectrum-amber/15 text-spectrum-amber' },
    { icon: GitBranch, label: 'Stem scans', value: data?.stem ?? 20, tone: 'bg-white/70 text-sage' },
  ]

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-ink">Plant Section</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <GlassCard key={it.label} padding="sm" className="flex items-center gap-3">
            <span className={cn('grid h-10 w-10 place-items-center rounded-inner', it.tone)}>
              <it.icon size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink">{it.label}</div>
              <div className="text-xs text-sage">{it.value} samples</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
