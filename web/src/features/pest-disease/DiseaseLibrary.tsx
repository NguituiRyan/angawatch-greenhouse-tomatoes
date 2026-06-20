import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Leaf,
  Stethoscope,
  ShieldCheck,
  Droplets,
  Sparkles,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { SmartImage } from '@/components/ui/SmartImage'
import { DISEASES, DISEASE_TYPE_TONE, type DiseaseInfo, type DiseaseType } from '@/config/diseases'
import { cn } from '@/lib/cn'

const FILTERS: (DiseaseType | 'All')[] = ['All', 'Fungal', 'Bacterial', 'Viral', 'Pest', 'Disorder']

/**
 * Tomato Disease Library — a collapsible reference embedded in the Pest & Disease
 * screen. Master grid + detail panel. Factual reference; see config/diseases.ts.
 */
export function DiseaseLibrary({
  selectedId: controlledId,
  onSelect,
}: {
  selectedId?: string
  onSelect?: (id: string) => void
} = {}) {
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [internalId, setInternalId] = useState(DISEASES[0].id)
  const selectedId = controlledId ?? internalId
  const setSelectedId = (id: string) => {
    setInternalId(id)
    onSelect?.(id)
  }

  // when another panel (forecast / detections feed) picks a disease, open the
  // library and clear the filter so the chosen entry is visible.
  useEffect(() => {
    if (controlledId) {
      setOpen(true)
      setFilter('All')
    }
  }, [controlledId])

  const list = useMemo(
    () => (filter === 'All' ? DISEASES : DISEASES.filter((d) => d.type === filter)),
    [filter],
  )
  const selected = DISEASES.find((d) => d.id === selectedId) ?? list[0] ?? DISEASES[0]

  return (
    <div id="disease-library" className="scroll-mt-6">
    <GlassCard padding="md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <BookOpen size={18} className="text-health-deep" />
        <h3 className="text-base font-semibold text-ink">Tomato Disease Library</h3>
        <Pill tone="lime" className="ml-1">
          {DISEASES.length} entries
        </Pill>
        <ChevronDown
          size={18}
          className={cn('ml-auto text-sage transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-4 animate-fade-in">
          {/* type filters */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-pill px-3 py-1 text-xs font-medium transition-all',
                  filter === f
                    ? 'bg-ink text-white'
                    : 'bg-white/55 text-sage hover:bg-white/80 hover:text-ink',
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* master grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {list.map((d) => (
              <DiseaseTile
                key={d.id}
                disease={d}
                active={d.id === selected.id}
                onClick={() => setSelectedId(d.id)}
              />
            ))}
          </div>

          {/* detail panel */}
          <DiseaseDetail disease={selected} />

          <p className="mt-4 border-t border-white/50 pt-3 text-[11px] leading-snug text-sage">
            Reference compiled from general plant-pathology sources (topic checklist:{' '}
            <a
              href="https://www.thespruce.com/identify-treat-prevent-tomato-diseases-7153094"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-health-deep underline decoration-dotted underline-offset-2"
            >
              The Spruce
            </a>
            ). Guidance only — confirm treatments, rates and local regulations with your agronomist.
          </p>
        </div>
      )}
    </GlassCard>
    </div>
  )
}

function DiseaseTile({
  disease,
  active,
  onClick,
}: {
  disease: DiseaseInfo
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group overflow-hidden rounded-inner bg-white/55 text-left transition hover:bg-white/85',
        active && 'ring-2 ring-lime/60',
      )}
    >
      <div className="aspect-[4/3] w-full bg-lime-tint/40">
        <SmartImage
          src={disease.image}
          alt={disease.name}
          className="h-full w-full"
          fallback={<TilePlaceholder />}
        />
      </div>
      <div className="p-2">
        <div className="truncate text-xs font-semibold text-ink">{disease.name}</div>
        <Pill tone={DISEASE_TYPE_TONE[disease.type]} className="mt-1">
          {disease.type}
        </Pill>
      </div>
    </button>
  )
}

function TilePlaceholder() {
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-lime-tint/60 to-white/30">
      <Leaf size={22} className="text-health-deep/60" />
    </div>
  )
}

function DiseaseDetail({ disease }: { disease: DiseaseInfo }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 rounded-inner bg-white/45 p-4 md:grid-cols-[200px_minmax(0,1fr)]">
      <div>
        <div className="aspect-[4/3] w-full overflow-hidden rounded-inner ring-1 ring-white/60">
          <SmartImage
            src={disease.image}
            alt={disease.name}
            className="h-full w-full"
            fallback={<TilePlaceholder />}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone={DISEASE_TYPE_TONE[disease.type]}>{disease.type}</Pill>
          {disease.aiClass && (
            <Pill tone="lime" className="gap-1">
              <Sparkles size={11} /> AI-detectable
            </Pill>
          )}
        </div>
        {disease.pathogen && (
          <p className="mt-2 text-[11px] italic text-sage">{disease.pathogen}</p>
        )}
      </div>

      <div>
        <h4 className="text-lg font-bold text-ink">{disease.name}</h4>
        <div className="mt-1 rounded-lg bg-white/60 px-3 py-2 text-xs text-sage">
          <span className="font-semibold text-ink">Favoured by:</span> {disease.conditions}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoColumn icon={Stethoscope} title="Symptoms" items={disease.symptoms} tone="text-spectrum-amber" />
          <InfoColumn icon={Droplets} title="Treatment" items={disease.treatment} tone="text-health-deep" />
          <InfoColumn icon={ShieldCheck} title="Prevention" items={disease.prevention} tone="text-health-deep" />
        </div>
      </div>
    </div>
  )
}

function InfoColumn({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof Stethoscope
  title: string
  items: string[]
  tone: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={14} className={tone} />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-sage">
            <span className={cn('mt-1 h-1 w-1 shrink-0 rounded-full bg-current', tone)} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}
