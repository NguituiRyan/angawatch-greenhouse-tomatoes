import { GreenhouseMonitoringCard } from './GreenhouseMonitoringCard'
import { HealthTrackingCard } from './HealthTrackingCard'
import { AILeafPanel } from './AILeafPanel'
import { PredictionBar } from './PredictionBar'
import { AerialMapCard } from './AerialMapCard'
import { PlantSection } from './PlantSection'
import type { Greenhouse } from '@/api/types'

/**
 * Crop Report — the default view. Three-column layout matching the reference:
 * monitoring + health on the left, the AI leaf panel in the centre,
 * farm overview + plant scans on the right.
 */
export function CropReport({
  greenhouse,
  onInsights,
}: {
  greenhouse: Greenhouse
  onInsights?: () => void
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_minmax(0,1fr)_330px]">
      {/* left column */}
      <div className="flex flex-col gap-5">
        <GreenhouseMonitoringCard greenhouse={greenhouse} />
        <HealthTrackingCard greenhouse={greenhouse} onInsights={onInsights} />
      </div>

      {/* centre column */}
      <div className="order-first flex flex-col justify-between gap-5 lg:order-none">
        <AILeafPanel />
        <PredictionBar greenhouse={greenhouse} />
      </div>

      {/* right column */}
      <div className="flex flex-col gap-5">
        <AerialMapCard greenhouse={greenhouse} />
        <PlantSection />
      </div>
    </div>
  )
}
