/**
 * Farm advisor — turns a leaf-scan result + live microclimate into a specific,
 * actionable plan: treat the detected disease, correct what's out of range, and
 * push conditions toward the optimum to maximize healthy tomato production.
 *
 * 100% rule-based and free — no API key, runs offline. Thresholds come from the
 * agronomist-tunable constants in config/tomato.ts and config/diseases.ts.
 */
import type { LeafScanResult, LatestTelemetry, GrowthStageKey } from '@/api/types'
import { DISEASES, type DiseaseInfo } from '@/config/diseases'
import { TOMATO_OPTIMA, NPK_BY_STAGE } from '@/config/tomato'

export type Urgency = 'now' | 'soon' | 'ongoing'

export interface ActionItem {
  text: string
  urgency: Urgency
}

export interface FarmActionPlan {
  disease?: DiseaseInfo
  healthy: boolean
  headline: string
  immediate: string[] // disease treatment steps
  environment: ActionItem[] // microclimate corrections vs. the ideal band
  maximize: string[] // prevention + production levers
}

function diseaseForClass(cls: string): DiseaseInfo | undefined {
  return DISEASES.find((d) => d.aiClass === cls)
}

function npkStageKey(stage?: GrowthStageKey): keyof typeof NPK_BY_STAGE {
  if (stage === 'vegetative') return 'vegetative'
  if (stage === 'flowering') return 'flowering'
  if (stage === 'fruitset' || stage === 'harvest') return 'fruiting'
  return 'seedling'
}

export function buildFarmActions(
  scan: LeafScanResult,
  latest?: LatestTelemetry,
  stage?: GrowthStageKey,
): FarmActionPlan {
  const O = TOMATO_OPTIMA
  const disease = diseaseForClass(scan.disease)
  const healthy = scan.is_healthy

  // ---- environment corrections: compare live sensors to the ideal band ----
  const environment: ActionItem[] = []
  if (latest) {
    const { airTempC: t, relativeHumidityPct: rh, soilMoisturePct: soil } = latest

    if (t > O.heatStressDayC)
      environment.push({ urgency: 'now', text: `Air temp ${t}°C is heat-stress (>32°C causes poor fruit set) — ventilate, shade and run cooling toward 21–27°C.` })
    else if (t > O.airTempDayC.max)
      environment.push({ urgency: 'soon', text: `Air temp ${t}°C is above ideal — open vents / add shading toward ~24°C.` })
    else if (t < O.coldStressC)
      environment.push({ urgency: 'now', text: `Air temp ${t}°C is cold-stress — add heating; hold nights at 16–18°C.` })
    else if (t < O.airTempDayC.min)
      environment.push({ urgency: 'soon', text: `Air temp ${t}°C is a little low — reduce ventilation / add gentle heat toward ~24°C.` })

    if (rh >= O.rhDiseaseRiskPct)
      environment.push({ urgency: 'now', text: `Humidity ${rh}% is in the fungal-risk zone — ventilate to 65–75% RH and stop evening watering.` })
    else if (rh > O.relativeHumidityPct.max)
      environment.push({ urgency: 'soon', text: `Humidity ${rh}% is a bit high — improve airflow toward 65–75% RH.` })
    else if (rh < O.rhStressPct)
      environment.push({ urgency: 'soon', text: `Humidity ${rh}% is too dry (transpiration stress) — mist / raise humidity toward 65–75% RH.` })

    if (soil < O.soilMoisturePct.min)
      environment.push({ urgency: 'now', text: `Soil moisture ${soil}% is low — irrigate; hold 60–80% of field capacity to prevent blossom-end rot.` })
    else if (soil > O.soilMoisturePct.max)
      environment.push({ urgency: 'soon', text: `Soil moisture ${soil}% is high — ease irrigation and improve drainage to avoid cracking and root disease.` })

    if (latest.soilPh < O.soilPh.min || latest.soilPh > O.soilPh.max)
      environment.push({ urgency: 'ongoing', text: `Bring soil pH ${latest.soilPh} into 6.0–6.8 so nutrients stay available.` })
    if (latest.ecDsPerM < O.fertigationEcDsPerM.min || latest.ecDsPerM > O.fertigationEcDsPerM.max)
      environment.push({ urgency: 'ongoing', text: `Tune fertigation EC ${latest.ecDsPerM} dS/m into the 2.0–3.5 range.` })
  }
  if (environment.length === 0)
    environment.push({ urgency: 'ongoing', text: 'Microclimate is in the ideal band — hold 21–27°C, 65–75% RH and 60–80% soil moisture.' })

  // ---- maximize healthy production ----
  const key = npkStageKey(stage)
  const npk = NPK_BY_STAGE[key]
  const maximize: string[] = []
  if (disease && !healthy) maximize.push(...disease.prevention)
  maximize.push(`Feed for the ${key} stage — target N:P:K ≈ ${npk.n} : ${npk.p} : ${npk.k} (${npk.note}).`)
  maximize.push(`Hit the light target — ${O.dliTargetMolPerM2Day.min}–${O.dliTargetMolPerM2Day.max} mol/m²/day DLI for strong, even fruiting.`)
  maximize.push(
    healthy
      ? 'Keep scouting weekly and maintain airflow — prevention protects the yield you already have.'
      : 'Re-scan the same plants in 3–5 days to confirm the treatment is working.',
  )

  const immediate = disease && !healthy ? [...disease.treatment] : []

  const conf = Math.round(scan.confidence * 100)
  const headline = healthy
    ? `Healthy leaf (${conf}% confidence). Keep conditions optimal to maximize yield.`
    : `${scan.disease_label} detected (${conf}% confidence, ${scan.severity} severity). Act now to limit spread and protect production.`

  return { disease, healthy, headline, immediate, environment, maximize }
}
