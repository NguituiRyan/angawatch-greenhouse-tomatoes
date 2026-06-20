/**
 * Disease likelihood engine.
 *
 * Ranks the diseases the AI model can predict by how likely they are to occur
 * RIGHT NOW, from two signals:
 *   1) live sensors  — current microclimate (temp, RH, leaf wetness, accumulated
 *      wet-hours, Tuta degree-day generation) scored against each disease's
 *      favouring conditions (see config/diseases.ts + tomato.ts);
 *   2) historic data — frequency of that disease in recent AI leaf scans, used as
 *      a Bayesian-style prior that nudges the weather score up or down.
 *
 * Output is a sorted list (most likely first) with the driving factors, so the
 * agronomist sees *why* a disease is flagged, not just a number.
 */
import type { LatestTelemetry, RiskBundle, TutaTracker, LeafDetection } from '@/api/types'
import { DISEASES, type DiseaseInfo } from '@/config/diseases'

export type RiskLevel = 'low' | 'watch' | 'high'

export interface DiseaseLikelihood {
  disease: DiseaseInfo
  likelihood: number // 0..1
  level: RiskLevel
  drivers: string[]
  weatherDriven: boolean
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** 1 at the centre of [min,max], falling to 0 at/beyond the edges */
const band = (v: number, min: number, max: number) => {
  const mid = (min + max) / 2
  const half = (max - min) / 2 || 1
  return clamp01(1 - Math.abs(v - mid) / half)
}
/** 0 below `start`, 1 at/above `full` */
const rampUp = (v: number, start: number, full: number) => clamp01((v - start) / (full - start))
/** 1 at/below `low`, 0 at/above `high` (i.e. "the drier the higher") */
const rampDown = (v: number, low: number, high: number) => clamp01((high - v) / (high - low))

const levelFor = (p: number): RiskLevel => (p >= 0.66 ? 'high' : p >= 0.4 ? 'watch' : 'low')

interface Ctx {
  temp: number
  rh: number
  wet: number // leaf wetness %
  wetHours: number
  wetTarget: number
  tuta?: TutaTracker
}

interface Scored {
  score: number
  drivers: string[]
  weatherDriven: boolean
}

/** Per-disease conduciveness from current conditions (no historic prior yet). */
const SCORERS: Record<string, (c: Ctx) => Scored> = {
  'late-blight': (c) => {
    const rhF = rampUp(c.rh, 80, 92)
    const tF = band(c.temp, 10, 26)
    const wF = clamp01(c.wetHours / Math.max(1, c.wetTarget))
    const drivers: string[] = []
    if (c.rh >= 85) drivers.push(`RH ${c.rh}% (≥90 critical)`)
    if (tF > 0.5) drivers.push(`${c.temp}°C in 10–26°C window`)
    if (c.wetHours > 0) drivers.push(`${c.wetHours}/${c.wetTarget} wet-hours logged`)
    return { score: 0.4 * rhF + 0.3 * tF + 0.3 * wF, drivers, weatherDriven: true }
  },
  'early-blight': (c) => {
    const tF = band(c.temp, 22, 31)
    const hF = rampUp(c.rh, 65, 88)
    const drivers: string[] = []
    if (tF > 0.5) drivers.push(`Warm ${c.temp}°C (24–29 ideal)`)
    if (hF > 0.4) drivers.push(`Humidity ${c.rh}%`)
    return { score: 0.55 * tF + 0.45 * hF, drivers, weatherDriven: true }
  },
  'septoria-leaf-spot': (c) => {
    const tF = band(c.temp, 18, 27)
    const wF = Math.max(rampUp(c.rh, 75, 92), rampUp(c.wet, 20, 60))
    const drivers: string[] = []
    if (tF > 0.5) drivers.push(`${c.temp}°C (20–25 favours)`)
    if (wF > 0.4) drivers.push(`Wet foliage (RH ${c.rh}%)`)
    return { score: 0.5 * tF + 0.5 * wF, drivers, weatherDriven: true }
  },
  'leaf-mold': (c) => {
    const hF = rampUp(c.rh, 82, 92)
    const tF = band(c.temp, 21, 25)
    const drivers: string[] = []
    if (c.rh >= 82) drivers.push(`RH ${c.rh}% (>85 greenhouse risk)`)
    if (tF > 0.5) drivers.push(`${c.temp}°C (22–24 ideal)`)
    return { score: 0.55 * hF + 0.45 * tF, drivers, weatherDriven: true }
  },
  'bacterial-spot': (c) => {
    const tF = band(c.temp, 23, 31)
    const hF = rampUp(c.rh, 70, 90)
    const drivers: string[] = []
    if (tF > 0.5) drivers.push(`Warm ${c.temp}°C`)
    if (hF > 0.4) drivers.push(`Wet/humid ${c.rh}%`)
    return { score: 0.5 * tF + 0.5 * hF, drivers, weatherDriven: true }
  },
  'target-spot': (c) => {
    const tF = band(c.temp, 22, 30)
    const wF = Math.max(rampUp(c.rh, 75, 92), rampUp(c.wet, 20, 60))
    const drivers: string[] = []
    if (tF > 0.5) drivers.push(`Warm ${c.temp}°C`)
    if (wF > 0.4) drivers.push(`Prolonged leaf wetness`)
    return { score: 0.5 * tF + 0.5 * wF, drivers, weatherDriven: true }
  },
  'spider-mites': (c) => {
    const tF = rampUp(c.temp, 26, 34)
    const dF = rampDown(c.rh, 40, 65) // high when dry
    const drivers: string[] = []
    if (tF > 0.3) drivers.push(`Hot ${c.temp}°C`)
    if (dF > 0.3) drivers.push(`Dry air (RH ${c.rh}%)`)
    return { score: 0.5 * tF + 0.5 * dF, drivers, weatherDriven: true }
  },
  'tuta-absoluta': (c) => {
    const g = (c.tuta?.generationProgressPct ?? 0) / 100
    const pressure = c.tuta?.pressure ?? 'low'
    const pF = pressure === 'high' ? 0.85 : pressure === 'watch' ? 0.55 : 0.2
    const tF = rampUp(c.temp, 18, 28)
    const drivers: string[] = []
    if (c.tuta) drivers.push(`Gen ${c.tuta.currentGeneration} at ${c.tuta.generationProgressPct}%`)
    if (c.tuta?.sprayWindowOpen) drivers.push('Spray window open')
    if (tF > 0.4) drivers.push(`Warm ${c.temp}°C speeds lifecycle`)
    return { score: 0.45 * g + 0.35 * pF + 0.2 * tF, drivers, weatherDriven: true }
  },
  'mosaic-virus': () => ({
    score: 0.12, // ever-present low baseline; spread by handling, not weather
    drivers: ['Spread by handling & tools (not weather-driven)'],
    weatherDriven: false,
  }),
  'yellow-leaf-curl-virus': (c) => {
    const warm = rampUp(c.temp, 24, 32) // whitefly pressure rises when warm
    const drivers = ['Whitefly-vectored']
    if (warm > 0.3) drivers.push(`Warm ${c.temp}°C favours whitefly`)
    return { score: 0.1 + 0.2 * warm, drivers, weatherDriven: false }
  },
}

const PRIOR_WEIGHT = 0.25

export function computeDiseaseLikelihoods(input: {
  latest?: LatestTelemetry
  risk?: RiskBundle
  tuta?: TutaTracker
  detections?: LeafDetection[]
}): DiseaseLikelihood[] {
  const { latest, risk, tuta, detections = [] } = input
  if (!latest) return []

  const ctx: Ctx = {
    temp: latest.airTempC,
    rh: latest.relativeHumidityPct,
    wet: latest.leafWetnessPct,
    wetHours: risk?.wetHours ?? 0,
    wetTarget: risk?.wetHoursToInfection ?? 10,
    tuta,
  }

  // historic prior: how often each class shows up in recent scans
  const counts: Record<string, number> = {}
  for (const d of detections) counts[d.disease] = (counts[d.disease] ?? 0) + 1
  const maxCount = Math.max(1, ...Object.values(counts))

  const predictable = DISEASES.filter((d) => d.aiClass && SCORERS[d.id])

  const results = predictable.map((disease) => {
    const scored = SCORERS[disease.id](ctx)
    const count = disease.aiClass ? (counts[disease.aiClass] ?? 0) : 0
    const prior = count / maxCount // 0..1
    const likelihood = clamp01(scored.score * (1 - PRIOR_WEIGHT) + prior * PRIOR_WEIGHT)
    const drivers = [...scored.drivers]
    if (count > 0) drivers.push(`Seen ${count}× in recent scans`)
    return {
      disease,
      likelihood,
      level: levelFor(likelihood),
      drivers: drivers.slice(0, 3),
      weatherDriven: scored.weatherDriven,
    }
  })

  return results.sort((a, b) => b.likelihood - a.likelihood)
}
