import { GlassCard } from '@/components/ui/GlassCard'
import { useScanSummary } from '@/api/hooks'
import { LeafIcon, FruitIcon, RootIcon, StemIcon } from '@/components/icons/PlantIcons'

type Tint = { icon: string; chip: string; glow: string }

const TINTS: Record<string, Tint> = {
  leaf: { icon: 'text-health-deep', chip: 'bg-health-deep/12', glow: 'rgba(111,178,62,0.45)' },
  fruit: { icon: 'text-spectrum-red', chip: 'bg-spectrum-red/12', glow: 'rgba(232,85,62,0.40)' },
  root: { icon: 'text-spectrum-amber', chip: 'bg-spectrum-amber/15', glow: 'rgba(232,162,61,0.42)' },
  stem: { icon: 'text-[#2f9b86]', chip: 'bg-[#2f9b86]/12', glow: 'rgba(47,155,134,0.40)' },
}

/** "Plant Section" — AI scan counts by plant part, each card tinted to its theme. */
export function PlantSection() {
  const { data } = useScanSummary()
  const items = [
    { key: 'leaf', Icon: LeafIcon, label: 'Leaf scans', value: data?.leaf ?? 921 },
    { key: 'fruit', Icon: FruitIcon, label: 'Fruit scans', value: data?.fruit ?? 142 },
    { key: 'root', Icon: RootIcon, label: 'Root scans', value: data?.root ?? 9 },
    { key: 'stem', Icon: StemIcon, label: 'Stem scans', value: data?.stem ?? 20 },
  ]

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-ink">Plant Section</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ key, Icon, label, value }) => {
          const t = TINTS[key]
          return (
            <GlassCard key={key} padding="sm" className="relative">
              {/* soft themed corner glow */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full blur-2xl"
                style={{ background: `radial-gradient(circle, ${t.glow}, transparent 70%)` }}
              />
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.chip} ${t.icon}`}>
                <Icon size={22} />
              </span>
              <div className="mt-3 text-2xl font-bold leading-none text-ink">
                {value.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-medium text-sage">{label}</div>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
