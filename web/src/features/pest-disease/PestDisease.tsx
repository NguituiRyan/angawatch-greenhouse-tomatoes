import { useState } from 'react'
import { LateBlightCard } from './LateBlightCard'
import { TutaTrackerCard } from './TutaTrackerCard'
import { LeafDetectionsFeed } from './LeafDetectionsFeed'
import { DiseaseForecastCard } from './DiseaseForecastCard'
import { RecommendationsList } from './RecommendationsList'
import { GreenhousePressureGrid } from './GreenhousePressureGrid'
import { DiseaseLibrary } from './DiseaseLibrary'
import type { Greenhouse } from '@/api/types'

/**
 * Pest & Disease — the tomato-specific operations screen.
 * Late-blight risk, Tuta absoluta tracking, the live AI detections feed, a
 * sensor-driven disease likelihood forecast, recommendations, per-greenhouse
 * pressure, and the disease reference library. Detections and forecast rows are
 * quick links into the library.
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
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>()

  const focusDisease = (id: string) => {
    setSelectedDiseaseId(id)
    requestAnimationFrame(() =>
      document
        .getElementById('disease-library')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <GreenhousePressureGrid selectedId={selectedId} onSelect={onSelect} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LateBlightCard greenhouse={greenhouse} />
        <TutaTrackerCard greenhouse={greenhouse} />
        <LeafDetectionsFeed onPickDisease={focusDisease} />
      </div>

      <DiseaseForecastCard greenhouse={greenhouse} onPickDisease={focusDisease} />

      <RecommendationsList greenhouse={greenhouse} />

      <DiseaseLibrary selectedId={selectedDiseaseId} onSelect={setSelectedDiseaseId} />
    </div>
  )
}
