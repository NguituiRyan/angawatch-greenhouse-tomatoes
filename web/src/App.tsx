import { useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { SegmentedNav } from '@/components/ui/SegmentedNav'
import { CropReport } from '@/features/crop-report'
import { PestDisease } from '@/features/pest-disease'
import { Management } from '@/features/management'
import { useGreenhouses, useAlerts } from '@/api/hooks'
import type { Greenhouse } from '@/api/types'

export type TabKey = 'management' | 'crop-report' | 'pest-disease'

const MOBILE_TABS: { value: TabKey; label: string }[] = [
  { value: 'management', label: 'Management' },
  { value: 'crop-report', label: 'Crop Report' },
  { value: 'pest-disease', label: 'Pest & Disease' },
]

const FALLBACK_GH: Greenhouse = {
  id: 'GH-01',
  name: 'Greenhouse GH-01',
  farm: 'Yatta Demo Farm',
  block: 'Block A101',
  cropVariety: 'Anna F1 (indeterminate)',
  growthStage: 'fruitset',
  daysFromTransplant: 63,
  plantCount: 1280,
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('crop-report')
  const [selectedId, setSelectedId] = useState('GH-01')

  const { data: greenhouses } = useGreenhouses()
  const { data: alerts } = useAlerts(selectedId)

  const greenhouse = useMemo(
    () => greenhouses?.find((g) => g.id === selectedId) ?? FALLBACK_GH,
    [greenhouses, selectedId],
  )

  const title =
    tab === 'crop-report'
      ? `Tomato · ${greenhouse.name}`
      : tab === 'pest-disease'
        ? `Pest & Disease · ${greenhouse.name}`
        : 'Fleet Management'

  const alertCount = (alerts ?? []).filter((a) => !a.acknowledged).length

  return (
    <AppShell>
      <TopNav active={tab} onChange={setTab} alertCount={alertCount} />

      {/* mobile tab switcher */}
      <div className="mt-4 md:hidden">
        <SegmentedNav options={MOBILE_TABS} value={tab} onChange={setTab} className="w-full justify-between" />
      </div>

      <div className="mt-6">
        <PageHeader title={title} location={greenhouse.farm} date="17th June, 2026" />
      </div>

      <main className="mt-6">
        {tab === 'crop-report' && (
          <CropReport greenhouse={greenhouse} onInsights={() => setTab('pest-disease')} />
        )}
        {tab === 'pest-disease' && (
          <PestDisease greenhouse={greenhouse} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {tab === 'management' && <Management selectedId={selectedId} onSelect={setSelectedId} />}
      </main>

      <footer className="mt-10 pb-4 text-center text-[11px] text-sage">
        AngaWatch · Greenhouse Tomato Intelligence — demo data via MSW. Connect the FastAPI platform to go live.
      </footer>
    </AppShell>
  )
}
