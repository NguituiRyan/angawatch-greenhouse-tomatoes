import { LateBlightCard } from './LateBlightCard'
import { TutaTrackerCard } from './TutaTrackerCard'
import { LeafDetectionsFeed } from './LeafDetectionsFeed'
import { RecommendationsList } from './RecommendationsList'
import { GreenhousePressureGrid } from './GreenhousePressureGrid'
import { DiseaseLibrary } from './DiseaseLibrary'
import type { Greenhouse } from '@/api/types'

/**
 * Pest & Disease — the tomato-specific operations screen.
 * Late-blight risk, Tuta absoluta tracking, the live AI detections feed,
 * active recommendations and per-greenhouse pressure.
 */
export function PestDisease({
  greenhouse,
  selectedId,
  onSelect,
}: {
  greenhouse: Greenhouse
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <GreenhousePressureGrid selectedId={selectedId} onSelect={onSelect} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LateBlightCard greenhouse={greenhouse} />
        <TutaTrackerCard greenhouse={greenhouse} />
        <LeafDetectionsFeed />
      </div>

      <RecommendationsList greenhouse={greenhouse} />

      <DiseaseLibrary />
    </div>
  )
}
