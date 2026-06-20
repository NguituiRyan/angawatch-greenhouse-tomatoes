/**
 * AngaWatch — Tomato agronomy reference constants.
 *
 * These are the agronomist-tunable thresholds that drive the Climate Suitability
 * Index, the risk engine, alerts and recommendations. They are intentionally
 * grouped and named so an agronomist can adjust them without touching UI code.
 * Values are sensible Kenya-greenhouse defaults — field-calibrate per site.
 */

export interface Range {
  min: number
  max: number
}

/** Optimal greenhouse conditions for tomato (Solanum lycopersicum). */
export const TOMATO_OPTIMA = {
  airTempDayC: { min: 21, max: 27, ideal: 24 },
  airTempNightC: { min: 16, max: 18 },
  heatStressDayC: 32, // >32°C day => pollen sterility / poor fruit set
  heatStressNightC: 24,
  coldStressC: 12,

  relativeHumidityPct: { min: 65, max: 75 }, // ideal band
  rhAcceptablePct: { min: 60, max: 80 },
  rhDiseaseRiskPct: 88, // >85–90% => fungal disease risk
  rhStressPct: 50, // <50% => transpiration stress

  soilMoisturePct: { min: 60, max: 80 }, // % of field capacity

  dliTargetMolPerM2Day: { min: 20, max: 30 },
  dliMinimumMolPerM2Day: 14,

  co2AmbientPpm: 400,
  co2EnrichmentPpm: { min: 700, max: 900 },

  soilPh: { min: 6.0, max: 6.8 },
  fertigationEcDsPerM: { min: 2.0, max: 3.5 },
} as const

/** Per-growth-stage NPK target ratios (N : P : K), exposed as config. */
export const NPK_BY_STAGE = {
  seedling: { n: 1, p: 0.6, k: 1, note: 'Establishment — gentle balanced feed' },
  vegetative: { n: 1.5, p: 0.5, k: 1, note: 'Higher N for canopy growth' },
  flowering: { n: 1, p: 0.5, k: 1, note: 'Balanced to support fruit set' },
  fruiting: { n: 1, p: 0.5, k: 2, note: 'Higher K for fruit fill & quality' },
} as const

/** Indicative days from transplant for each growth stage. */
export const GROWTH_STAGES = [
  { key: 'seedling', label: 'Seedling / establishment', days: { min: 0, max: 14 } },
  { key: 'vegetative', label: 'Vegetative', days: { min: 14, max: 40 } },
  { key: 'flowering', label: 'Flowering', days: { min: 40, max: 55 } },
  { key: 'fruitset', label: 'Fruit set & development', days: { min: 55, max: 85 } },
  { key: 'harvest', label: 'Harvest (indeterminate = continuous)', days: { min: 75, max: 120 } },
] as const

/** Disease microclimate triggers — drive the predictive risk engine. */
export const DISEASE_TRIGGERS = {
  lateBlight: {
    label: 'Late blight',
    pathogen: 'Phytophthora infestans',
    rhMinPct: 90,
    tempC: { min: 10, max: 26 },
    leafWetnessHours: 10, // wet hours to infection
    note: 'Cool + wet. Most destructive. Accumulate wet-hours (RH≥90% & 10–26°C).',
  },
  earlyBlight: {
    label: 'Early blight',
    pathogen: 'Alternaria solani',
    tempC: { min: 24, max: 29 },
    note: 'Warm + humidity / leaf wetness; concentric leaf spots.',
  },
  septoria: {
    label: 'Septoria leaf spot',
    tempC: { min: 20, max: 25 },
    note: 'Wet foliage; avoid overhead watering.',
  },
  leafMould: {
    label: 'Leaf mould',
    pathogen: 'Passalora fulva',
    rhMinPct: 85,
    tempC: { min: 22, max: 24 },
    note: 'Greenhouse-specific. Lower RH / ventilate.',
  },
  powderyMildew: {
    label: 'Powdery mildew',
    tempC: { min: 22, max: 30 },
    note: 'Moderate humidity.',
  },
} as const

/** Tuta absoluta degree-day model defaults — FIELD-CALIBRATE per site. */
export const TUTA_MODEL = {
  label: 'Tuta absoluta (tomato leaf miner)',
  baseTempC: 8, // development base temp (~6–9°C)
  degreeDaysPerGeneration: 450, // accumulated DD per generation (default)
  trapThresholds: {
    low: 5, // moths/trap/week
    watch: 20,
    high: 50,
  },
  maxLossPct: 100,
  note: 'Lifecycle as short as ~2 weeks warm; 7–12 generations/yr. Calibrate DD threshold.',
} as const

/** Climate Suitability Index weighting — how each metric contributes (0..1). */
export const SUITABILITY_WEIGHTS = {
  airTemp: 0.35,
  humidity: 0.3,
  soilMoisture: 0.25,
  light: 0.1,
} as const

/** The 11 tomato leaf classes recognised by the AI model (mirrors /ml & /ai). */
export const LEAF_CLASSES = [
  'Tomato_healthy',
  'Tomato_Bacterial_spot',
  'Tomato_Early_blight',
  'Tomato_Late_blight',
  'Tomato_Leaf_Mold',
  'Tomato_Septoria_leaf_spot',
  'Tomato_Spider_mites_two_spotted',
  'Tomato_Target_Spot',
  'Tomato_Yellow_Leaf_Curl_Virus',
  'Tomato_mosaic_virus',
  'Tuta_absoluta_damage',
] as const

export type LeafClass = (typeof LEAF_CLASSES)[number]

export const LEAF_CLASS_LABELS: Record<LeafClass, string> = {
  Tomato_healthy: 'Healthy',
  Tomato_Bacterial_spot: 'Bacterial spot',
  Tomato_Early_blight: 'Early blight',
  Tomato_Late_blight: 'Late blight',
  Tomato_Leaf_Mold: 'Leaf mould',
  Tomato_Septoria_leaf_spot: 'Septoria leaf spot',
  Tomato_Spider_mites_two_spotted: 'Spider mites',
  Tomato_Target_Spot: 'Target spot',
  Tomato_Yellow_Leaf_Curl_Virus: 'Yellow leaf curl virus',
  Tomato_mosaic_virus: 'Mosaic virus',
  Tuta_absoluta_damage: 'Tuta absoluta damage',
}
