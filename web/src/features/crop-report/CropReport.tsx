import { GreenhouseStatusCard } from './GreenhouseStatusCard'
import { HealthTrackingCard } from './HealthTrackingCard'
import { AILeafPanel } from './AILeafPanel'
import { TodaysPriority } from './TodaysPriority'
import { AerialMapCard } from './AerialMapCard'
import { PlantSection } from './PlantSection'
import type { Greenhouse } from '@/api/types'

/**
 * Crop Report — the default view. Leads with plain-language greenhouse advisories
 * (left), the AI leaf scanner + today's priority (centre), and the farm overview
 * + scan summary (right).
 */
export function CropReport({
  greenhouse,
  onInsights,
  onPrevGreenhouse,
  onNextGreenhouse,
}: {
  greenhouse: Greenhouse
  onInsights?: () => void
  onPrevGreenhouse?: () => void
  onNextGreenhouse?: () => void
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)_330px]">
      {/* left column — what's happening + what to do */}
      <div className="flex flex-col gap-5">
        <GreenhouseStatusCard greenhouse={greenhouse} />
        <HealthTrackingCard
          greenhouse={greenhouse}
          onInsights={onInsights}
          onPrev={onPrevGreenhouse}
          onNext={onNextGreenhouse}
        />
      </div>

      {/* centre column — AI leaf scanner + the one thing to do now */}
      <div className="order-first flex flex-col gap-5 lg:order-none">
        <AILeafPanel greenhouse={greenhouse} />
        <TodaysPriority greenhouse={greenhouse} />
      </div>

      {/* right column — farm overview + scans */}
      <div className="flex flex-col gap-5">
        <AerialMapCard greenhouse={greenhouse} />
        <PlantSection />
      </div>
    </div>
  )
}
