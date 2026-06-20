/**
 * Deterministic mock dataset for AngaWatch (tomato greenhouse).
 * Seeded so the dashboard renders the same realistic values every run and
 * the numbers echo the reference design (97% in range, +15%, 139/160h, 80% etc).
 */
import type {
  AgronomistCard,
  Alert,
  FarmStats,
  Greenhouse,
  LatestTelemetry,
  LeafDetection,
  LightProgress,
  PlantingSuitability,
  Recommendation,
  RiskBundle,
  ScanSummary,
  SuitabilitySeries,
  TimeRange,
  TutaTracker,
} from '@/api/types'
import { LEAF_CLASS_LABELS, TOMATO_OPTIMA, TUTA_MODEL } from '@/config/tomato'

/* ---- seeded PRNG (mulberry32) so output is stable & reproducible ---- */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const GREENHOUSES: Greenhouse[] = [
  {
    id: 'GH-01',
    name: 'Greenhouse GH-01',
    farm: 'Yatta Demo Farm',
    block: 'Block A101',
    cropVariety: 'Anna F1 (indeterminate)',
    growthStage: 'fruitset',
    daysFromTransplant: 63,
    plantCount: 1280,
  },
  {
    id: 'GH-02',
    name: 'Greenhouse GH-02',
    farm: 'Yatta Demo Farm',
    block: 'Block A102',
    cropVariety: 'Rio Grande (determinate)',
    growthStage: 'flowering',
    daysFromTransplant: 47,
    plantCount: 980,
  },
  {
    id: 'GH-03',
    name: 'Greenhouse GH-03',
    farm: 'Yatta Demo Farm',
    block: 'Block B201',
    cropVariety: 'Anna F1 (indeterminate)',
    growthStage: 'vegetative',
    daysFromTransplant: 28,
    plantCount: 996,
  },
]

const RANGE_POINTS: Record<TimeRange, number> = {
  '12h': 12,
  '24h': 24,
  '48h': 24,
  week: 7,
  month: 30,
}

function inOptimal(temp: number, rh: number, soil: number): boolean {
  return (
    temp >= TOMATO_OPTIMA.airTempDayC.min &&
    temp <= TOMATO_OPTIMA.airTempDayC.max &&
    rh >= TOMATO_OPTIMA.relativeHumidityPct.min &&
    rh <= TOMATO_OPTIMA.relativeHumidityPct.max &&
    soil >= TOMATO_OPTIMA.soilMoisturePct.min &&
    soil <= TOMATO_OPTIMA.soilMoisturePct.max
  )
}

/** Smooth 0..1 suitability from how centred each metric is in its ideal band. */
function suitabilityScore(temp: number, rh: number, soil: number): number {
  const band = (v: number, r: { min: number; max: number }) => {
    const mid = (r.min + r.max) / 2
    const half = (r.max - r.min) / 2
    return Math.max(0, 1 - Math.abs(v - mid) / (half * 1.6))
  }
  return (
    0.4 * band(temp, TOMATO_OPTIMA.airTempDayC) +
    0.32 * band(rh, TOMATO_OPTIMA.relativeHumidityPct) +
    0.28 * band(soil, TOMATO_OPTIMA.soilMoisturePct)
  )
}

export function buildSuitability(id: string, range: TimeRange): SuitabilitySeries {
  const n = RANGE_POINTS[range]
  const rand = mulberry32(hash(id + range))
  const points = Array.from({ length: n }, (_, i) => {
    // diurnal-ish curve: dips early/late, comfortable mid-window
    const phase = Math.sin((i / n) * Math.PI)
    const temp = 19 + phase * 7 + (rand() - 0.5) * 2.4
    const rh = 78 - phase * 14 + (rand() - 0.5) * 6
    const soil = 70 + Math.sin(i * 0.7) * 8 + (rand() - 0.5) * 4
    const label = range === 'week' ? `D${i + 1}` : range === 'month' ? `${i + 1}` : `${i}:00`
    return {
      t: label,
      score: clamp01(suitabilityScore(temp, rh, soil)),
      airTempC: round1(temp),
      relativeHumidityPct: Math.round(rh),
      soilMoisturePct: Math.round(soil),
    }
  })
  const optimal = points.filter((p) => inOptimal(p.airTempC, p.relativeHumidityPct, p.soilMoisturePct))
  // Nudge to the reference's headline 97% for the default 12h view.
  const inOptimalPct = range === '12h' ? 97 : Math.round((optimal.length / points.length) * 100)
  return { greenhouseId: id, metric: 'climate_suitability', range, points, inOptimalPct, deltaPct: 15 }
}

export function buildLatest(id: string): LatestTelemetry {
  const rand = mulberry32(hash(id + 'latest'))
  return {
    greenhouseId: id,
    timestamp: '2026-06-17T10:32:00Z',
    airTempC: round1(23.6 + (rand() - 0.5) * 1.5),
    relativeHumidityPct: Math.round(70 + (rand() - 0.5) * 6),
    soilMoisturePct: Math.round(72 + (rand() - 0.5) * 6),
    co2Ppm: Math.round(620 + rand() * 120),
    soilPh: round1(6.4 + (rand() - 0.5) * 0.3),
    ecDsPerM: round1(2.6 + (rand() - 0.5) * 0.4),
    leafWetnessPct: Math.round(18 + rand() * 12),
    inOptimalRangePct: 97,
  }
}

export function buildLight(id: string): LightProgress {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const rand = mulberry32(hash(id + 'light'))
  const daily = days.map((day) => {
    const mol = round1(18 + rand() * 12)
    const level: LightProgress['daily'][number]['level'] =
      mol < 15 ? 'low' : mol > 26 ? 'high' : 'ok'
    return { day, mol, level }
  })
  return {
    greenhouseId: id,
    hoursAccumulated: 139,
    hoursTarget: 160,
    dliTodayMol: round1(24.1),
    dliTargetMol: 26,
    deltaPct: 80,
    daily,
    projectedYieldUpliftPct: 14.97,
  }
}

export function buildRisk(id: string): RiskBundle {
  const wetHours = id === 'GH-02' ? 7 : id === 'GH-03' ? 2 : 4
  const lateLevel = wetHours >= 8 ? 'high' : wetHours >= 5 ? 'watch' : 'low'
  return {
    greenhouseId: id,
    wetHours,
    wetHoursToInfection: 10,
    assessments: [
      {
        key: 'late_blight',
        label: 'Late blight',
        level: lateLevel,
        score: Math.min(100, wetHours * 11),
        headline:
          lateLevel === 'high'
            ? 'High — infection window approaching'
            : lateLevel === 'watch'
              ? 'Watch — wet hours accumulating'
              : 'Low — conditions unfavourable',
        detail: `${wetHours}/10 wet-hours (RH≥90% & 10–26°C) toward infection.`,
        hoursAhead: lateLevel === 'low' ? undefined : (10 - wetHours) * 2,
        action:
          lateLevel === 'high'
            ? 'Preventive fungicide tonight; ventilate to drop RH below 85%.'
            : lateLevel === 'watch'
              ? 'Ventilate now to break the wet-hours streak.'
              : 'Maintain airflow; keep monitoring.',
      },
      {
        key: 'tuta',
        label: 'Tuta absoluta',
        level: id === 'GH-01' ? 'watch' : 'low',
        score: id === 'GH-01' ? 58 : 24,
        headline:
          id === 'GH-01' ? 'Generation 2 emerging — spray window open' : 'Pressure low',
        detail: 'Pheromone-trap counts trending up; degree-day model nearing generation threshold.',
        action: 'Check traps; apply BT / spinosad within the open spray window.',
      },
      {
        key: 'nutrient',
        label: 'Nutrient',
        level: 'low',
        score: 18,
        headline: 'Balanced for fruit set',
        detail: 'EC 2.6 dS/m, pH 6.4 — within target. Shift toward higher K as fruiting advances.',
        action: 'Increase K in fertigation next week (target N:P:K ≈ 1:0.5:2).',
      },
      {
        key: 'water',
        label: 'Water',
        level: 'low',
        score: 22,
        headline: 'Soil moisture steady',
        detail: 'Avoid swings to prevent blossom-end rot and fruit cracking.',
        action: 'Keep soil moisture 60–80% of field capacity.',
      },
    ],
  }
}

export function buildAlerts(id: string): Alert[] {
  return [
    {
      id: `${id}-a1`,
      greenhouseId: id,
      severity: 'moderate',
      title: 'Humidity climbing overnight',
      message: 'RH reached 86% at 04:00 — within leaf-mould risk band for GH-01.',
      createdAt: '2026-06-17T04:10:00Z',
      acknowledged: false,
    },
    {
      id: `${id}-a2`,
      greenhouseId: id,
      severity: 'high',
      title: 'Tuta absoluta spray window open',
      message: 'Degree-day model indicates Generation 2 emergence. Act within 48h.',
      createdAt: '2026-06-17T08:00:00Z',
      acknowledged: false,
    },
  ]
}

export function buildRecommendations(id: string): Recommendation[] {
  return [
    {
      id: `${id}-r1`,
      greenhouseId: id,
      kind: 'ventilate',
      title: 'Ventilate to drop RH below 85%',
      detail: 'Open roof vents 30% for 2h to break the overnight wet-hours streak.',
      priority: 'high',
      dueWindow: 'Now',
    },
    {
      id: `${id}-r2`,
      greenhouseId: id,
      kind: 'spray',
      title: 'Tuta absoluta — preventive spray',
      detail: 'Spray window open for Generation 2. Use BT / spinosad; rotate modes of action.',
      priority: 'high',
      dueWindow: 'Within 48h',
    },
    {
      id: `${id}-r3`,
      greenhouseId: id,
      kind: 'nutrient',
      title: 'Shift fertigation toward higher K',
      detail: 'Fruit fill underway — move N:P:K toward 1:0.5:2 for fruit quality.',
      priority: 'medium',
      dueWindow: 'This week',
    },
    {
      id: `${id}-r4`,
      greenhouseId: id,
      kind: 'irrigate',
      title: 'Stabilise soil moisture',
      detail: 'Hold 60–80% field capacity; avoid swings to prevent blossom-end rot.',
      priority: 'low',
      dueWindow: 'Ongoing',
    },
  ]
}

export function buildTuta(id: string): TutaTracker {
  const rand = mulberry32(hash(id + 'tuta'))
  const dates = ['Jun 03', 'Jun 06', 'Jun 09', 'Jun 12', 'Jun 15', 'Jun 17']
  const base = id === 'GH-01' ? 8 : 3
  const trapCounts = dates.map((date, i) => ({
    date,
    count: Math.round(base + i * (id === 'GH-01' ? 7 : 2) + rand() * 4),
  }))
  const dd = id === 'GH-01' ? 380 : 210
  return {
    greenhouseId: id,
    pressure: id === 'GH-01' ? 'watch' : 'low',
    trapCounts,
    trapThreshold: TUTA_MODEL.trapThresholds.watch,
    degreeDaysAccumulated: dd,
    degreeDaysPerGeneration: TUTA_MODEL.degreeDaysPerGeneration,
    currentGeneration: Math.floor(dd / TUTA_MODEL.degreeDaysPerGeneration) + 2,
    generationProgressPct: Math.round(((dd % TUTA_MODEL.degreeDaysPerGeneration) / TUTA_MODEL.degreeDaysPerGeneration) * 100),
    sprayWindowOpen: id === 'GH-01',
    note:
      id === 'GH-01'
        ? 'Generation 2 emerging — spray window open; check traps.'
        : 'Below action threshold — keep monitoring traps.',
  }
}

const DETECTION_SEED: { cls: keyof typeof LEAF_CLASS_LABELS; gh: string; ago: string; sev: LeafDetection['severity']; conf: number; chl: number; glcm: number; health: number }[] = [
  { cls: 'Tomato_Late_blight', gh: 'GH-01', ago: '12 min ago', sev: 'high', conf: 0.93, chl: 0.42, glcm: 0.81, health: 38 },
  { cls: 'Tomato_healthy', gh: 'GH-03', ago: '38 min ago', sev: 'none', conf: 0.98, chl: 0.86, glcm: 0.19, health: 94 },
  { cls: 'Tomato_Leaf_Mold', gh: 'GH-01', ago: '1 h ago', sev: 'moderate', conf: 0.88, chl: 0.61, glcm: 0.58, health: 64 },
  { cls: 'Tuta_absoluta_damage', gh: 'GH-02', ago: '2 h ago', sev: 'high', conf: 0.9, chl: 0.55, glcm: 0.72, health: 47 },
  { cls: 'Tomato_Septoria_leaf_spot', gh: 'GH-02', ago: '3 h ago', sev: 'moderate', conf: 0.84, chl: 0.6, glcm: 0.55, health: 61 },
  { cls: 'Tomato_healthy', gh: 'GH-01', ago: '5 h ago', sev: 'none', conf: 0.97, chl: 0.83, glcm: 0.22, health: 91 },
]

export function buildDetections(id?: string): LeafDetection[] {
  return DETECTION_SEED.filter((d) => !id || d.gh === id).map((d, i) => ({
    id: `det-${i}`,
    greenhouseId: d.gh,
    disease: d.cls,
    disease_label: LEAF_CLASS_LABELS[d.cls],
    confidence: d.conf,
    chl_index: d.chl,
    glcm_level: d.glcm,
    health_score: d.health,
    severity: d.sev,
    is_healthy: d.cls === 'Tomato_healthy',
    recommendation:
      d.cls === 'Tomato_healthy'
        ? 'No action — maintain optimal conditions.'
        : 'Review recommendations and treat the affected zone.',
    scanned_at: '2026-06-17T10:00:00Z',
    model_version: 'mock-0.1.0',
  }))
}

export const FARM_STATS: FarmStats = {
  totalPlants: 3256,
  projectedHarvestKg: 13530,
  activeGreenhouses: 3,
  totalFarmers: 32,
}

export const SCAN_SUMMARY: ScanSummary = { leaf: 921, fruit: 142, root: 9, stem: 20 }

export function buildAgronomist(id: string): AgronomistCard {
  void id
  return {
    name: 'Amara Njoroge',
    role: 'Lead Agronomist',
    plants: 300,
    greenhouses: 3,
  }
}

export function buildPlanting(id: string): PlantingSuitability {
  const s = buildSuitability(id, '24h')
  const avg = s.points.reduce((a, p) => a + p.score, 0) / s.points.length
  return {
    greenhouseId: id,
    score: clamp01(avg),
    verdict: avg > 0.6 ? 'Good for planting' : avg > 0.4 ? 'Marginal — monitor' : 'Hold planting',
    status: 'AI is scanning every part of the plant',
  }
}

/** A deterministic stand-in leaf-scan result for the centre panel on load. */
export function defaultLeafScan(): LeafDetection {
  return {
    id: 'leaf-default',
    greenhouseId: 'GH-01',
    disease: 'Tomato_healthy',
    disease_label: LEAF_CLASS_LABELS.Tomato_healthy,
    confidence: 0.95,
    chl_index: 0.783,
    glcm_level: 0.689,
    health_score: 80,
    severity: 'none',
    is_healthy: true,
    recommendation: 'Healthy canopy — maintain temperature 21–27°C and RH 65–75%.',
    scanned_at: '2026-06-17T10:32:00Z',
    model_version: 'mock-0.1.0',
  }
}

/* ---- helpers ---- */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}
function round1(v: number) {
  return Math.round(v * 10) / 10
}
