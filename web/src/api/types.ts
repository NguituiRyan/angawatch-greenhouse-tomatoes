/**
 * AngaWatch API contract — shared TypeScript types.
 * The MSW mock layer and the (future) FastAPI backend both satisfy these.
 */

import type { LeafClass } from '@/config/tomato'

export type RiskLevel = 'low' | 'watch' | 'high'
export type Severity = 'none' | 'low' | 'moderate' | 'high'
export type TimeRange = '12h' | '24h' | '48h' | 'week' | 'month'
export type GrowthStageKey = 'seedling' | 'vegetative' | 'flowering' | 'fruitset' | 'harvest'

/* ------------------------------------------------------------------ */
/* Greenhouses & telemetry                                            */
/* ------------------------------------------------------------------ */

export interface Greenhouse {
  id: string // e.g. "GH-01"
  name: string // e.g. "Greenhouse GH-01"
  farm: string // e.g. "Yatta Demo Farm"
  block: string // e.g. "Block A101"
  cropVariety: string // e.g. "Anna F1 (indeterminate)"
  growthStage: GrowthStageKey
  daysFromTransplant: number
  plantCount: number
}

export interface LatestTelemetry {
  greenhouseId: string
  timestamp: string
  airTempC: number
  relativeHumidityPct: number
  soilMoisturePct: number
  co2Ppm: number
  soilPh: number
  ecDsPerM: number
  leafWetnessPct: number
  /** 0..100 share of recent hours the greenhouse stayed in tomato's ideal band */
  inOptimalRangePct: number
}

/** One point of the Climate Suitability Index spectrum strip. */
export interface SuitabilityPoint {
  t: string // ISO time or short label
  /** 0..1 suitability; mapped to the red→green spectrum */
  score: number
  airTempC: number
  relativeHumidityPct: number
  soilMoisturePct: number
}

export interface SuitabilitySeries {
  greenhouseId: string
  metric: 'climate_suitability'
  range: TimeRange
  points: SuitabilityPoint[]
  /** % of points within the optimal band — drives "In optimal range — 97% today" */
  inOptimalPct: number
  deltaPct: number // vs previous comparable window (the green "+15%" pill)
}

/* ------------------------------------------------------------------ */
/* Light / DLI                                                        */
/* ------------------------------------------------------------------ */

export interface LightProgress {
  greenhouseId: string
  /** accumulated photosynthetically-active hours this week */
  hoursAccumulated: number
  hoursTarget: number
  dliTodayMol: number
  dliTargetMol: number
  deltaPct: number
  /** per-day light values for the dotted activity row (last 7 days) */
  daily: { day: string; mol: number; level: 'low' | 'ok' | 'high' }[]
  projectedYieldUpliftPct: number
}

/* ------------------------------------------------------------------ */
/* Risk engine                                                        */
/* ------------------------------------------------------------------ */

export interface RiskAssessment {
  key: 'late_blight' | 'tuta' | 'nutrient' | 'water' | 'heat'
  label: string
  level: RiskLevel
  /** 0..100 normalised pressure */
  score: number
  headline: string
  detail: string
  hoursAhead?: number
  action: string
}

export interface RiskBundle {
  greenhouseId: string
  assessments: RiskAssessment[]
  /** accumulated leaf-wetness hours toward late-blight infection */
  wetHours: number
  wetHoursToInfection: number
}

/* ------------------------------------------------------------------ */
/* Alerts & recommendations                                          */
/* ------------------------------------------------------------------ */

export interface Alert {
  id: string
  greenhouseId: string
  severity: Severity
  title: string
  message: string
  createdAt: string
  acknowledged: boolean
}

export interface Recommendation {
  id: string
  greenhouseId: string
  kind: 'ventilate' | 'irrigate' | 'spray' | 'nutrient' | 'scout'
  title: string
  detail: string
  priority: 'low' | 'medium' | 'high'
  dueWindow: string
}

/* ------------------------------------------------------------------ */
/* Tuta absoluta tracker                                             */
/* ------------------------------------------------------------------ */

export interface TutaTracker {
  greenhouseId: string
  pressure: RiskLevel
  trapCounts: { date: string; count: number }[] // pheromone trap trend
  trapThreshold: number
  degreeDaysAccumulated: number
  degreeDaysPerGeneration: number
  currentGeneration: number
  generationProgressPct: number
  sprayWindowOpen: boolean
  note: string
}

/* ------------------------------------------------------------------ */
/* AI leaf scan                                                       */
/* ------------------------------------------------------------------ */

export interface LeafScanResult {
  disease: LeafClass
  disease_label: string
  confidence: number // 0..1
  chl_index: number // 0..1 chlorophyll index ("Chl")
  glcm_level: number // 0..1 texture/severity ("GLCM Level")
  health_score: number // 0..100
  severity: Severity
  is_healthy: boolean
  recommendation: string
  scanned_at: string
  model_version: string
  /** top alternative predictions (incl. non-tomato), most likely first */
  alternatives?: { label: string; confidence: number }[]
  /** true when the model is unsure or the top guess isn't a tomato leaf */
  low_confidence?: boolean
}

export interface LeafDetection extends LeafScanResult {
  id: string
  greenhouseId: string
  thumbnailUrl?: string
}

/* ------------------------------------------------------------------ */
/* Aggregate stats & scan summary                                    */
/* ------------------------------------------------------------------ */

export interface FarmStats {
  totalPlants: number
  projectedHarvestKg: number
  activeGreenhouses: number
  totalFarmers: number
}

export interface ScanSummary {
  leaf: number
  fruit: number
  root: number
  stem: number
}

export interface AgronomistCard {
  name: string
  role: string // "Agronomist" | "Farmer"
  avatarUrl?: string
  plants: number
  greenhouses: number
}

export interface PlantingSuitability {
  greenhouseId: string
  /** 0..1 suitability for the next planting cycle */
  score: number
  verdict: string // "Good for planting"
  status: string // "AI is scanning every part of the plant"
}
