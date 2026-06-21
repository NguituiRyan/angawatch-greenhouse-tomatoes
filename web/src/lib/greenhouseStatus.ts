/**
 * Translates live node-sensor readings + the risk engine into plain-language
 * advisories a farmer can act on — "humidity is 88%, so ventilate now" — instead
 * of abstract charts.
 *
 * Thresholds are grounded in greenhouse-tomato references (day 21-27°C, RH ~65-75%
 * with >80-85% favouring disease, VPD ~0.8-1.2 kPa); see NOTES.md for sources.
 */
import type { LatestTelemetry, RiskBundle, LightProgress, TutaTracker } from '@/api/types'
import { TOMATO_OPTIMA } from '@/config/tomato'

export type StatusLevel = 'good' | 'watch' | 'alert'
export type StatusIcon = 'temp' | 'humidity' | 'vpd' | 'soil' | 'light' | 'blight' | 'tuta'

export interface StatusItem {
  id: string
  icon: StatusIcon
  label: string
  value: string
  level: StatusLevel
  message: string
}

/** Vapour Pressure Deficit (kPa) — the pro metric for transpiration & nutrient uptake. */
export function vpdKpa(tempC: number, rhPct: number): number {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
  return Math.round(svp * (1 - rhPct / 100) * 100) / 100
}

const RANK: Record<StatusLevel, number> = { alert: 0, watch: 1, good: 2 }

export function buildGreenhouseStatus(input: {
  latest?: LatestTelemetry
  risk?: RiskBundle
  light?: LightProgress
  tuta?: TutaTracker
}): StatusItem[] {
  const { latest, risk, light, tuta } = input
  const O = TOMATO_OPTIMA
  const items: StatusItem[] = []

  if (latest) {
    const t = latest.airTempC
    const rh = latest.relativeHumidityPct
    const soil = latest.soilMoisturePct

    // air temperature
    let temp: Omit<StatusItem, 'id' | 'icon' | 'label' | 'value'>
    if (t > O.heatStressDayC)
      temp = { level: 'alert', message: 'Too hot — above 32°C harms fruit set. Shade and ventilate toward ~24°C.' }
    else if (t > O.airTempDayC.max)
      temp = { level: 'watch', message: 'A little warm. Open vents / add shade to settle into the 21–27°C band.' }
    else if (t < O.coldStressC)
      temp = { level: 'alert', message: 'Too cold — add heat; keep nights 16–18°C to avoid stalled growth.' }
    else if (t < O.airTempDayC.min)
      temp = { level: 'watch', message: 'Slightly cool. Ease ventilation / add gentle heat toward ~24°C.' }
    else temp = { level: 'good', message: 'Right in the ideal 21–27°C band — great for fruit set.' }
    items.push({ id: 'temp', icon: 'temp', label: 'Air temperature', value: `${t}°C`, ...temp })

    // humidity
    let hum: Omit<StatusItem, 'id' | 'icon' | 'label' | 'value'>
    if (rh >= O.rhDiseaseRiskPct)
      hum = { level: 'alert', message: 'Too humid — fungal-disease risk. Ventilate and stop evening watering to reach 65–75%.' }
    else if (rh > O.relativeHumidityPct.max)
      hum = { level: 'watch', message: 'A touch high. Improve airflow toward the 65–75% pollination sweet spot.' }
    else if (rh < O.rhStressPct)
      hum = { level: 'watch', message: 'Air is dry — mist or damp the paths to lift humidity toward 65–75%.' }
    else hum = { level: 'good', message: 'In the 65–75% sweet spot — good pollination, low disease risk.' }
    items.push({ id: 'humidity', icon: 'humidity', label: 'Humidity', value: `${rh}%`, ...hum })

    // VPD
    const v = vpdKpa(t, rh)
    let vpd: Omit<StatusItem, 'id' | 'icon' | 'label' | 'value'>
    if (v < 0.4) vpd = { level: 'watch', message: 'Very low VPD — muggy air weakens transpiration & calcium uptake. Boost airflow.' }
    else if (v > 1.5) vpd = { level: 'watch', message: 'High VPD — plants lose water fast. Raise humidity / shade to ease stress.' }
    else vpd = { level: 'good', message: 'Healthy VPD (0.8–1.2 ideal) — plants transpire and feed well.' }
    items.push({ id: 'vpd', icon: 'vpd', label: 'VPD · transpiration', value: `${v} kPa`, ...vpd })

    // soil moisture
    let sm: Omit<StatusItem, 'id' | 'icon' | 'label' | 'value'>
    if (soil < O.soilMoisturePct.min)
      sm = { level: 'alert', message: 'Drying out — irrigate. Moisture swings cause blossom-end rot and cracking.' }
    else if (soil > O.soilMoisturePct.max)
      sm = { level: 'watch', message: 'On the wet side — ease irrigation and check drainage to protect roots.' }
    else sm = { level: 'good', message: 'Steady at 60–80% field capacity — keep it even to avoid blossom-end rot.' }
    items.push({ id: 'soil', icon: 'soil', label: 'Soil moisture', value: `${soil}%`, ...sm })
  }

  const lb = risk?.assessments.find((a) => a.key === 'late_blight')
  if (lb) {
    items.push({
      id: 'blight',
      icon: 'blight',
      label: 'Late blight risk',
      value: lb.level === 'low' ? 'Low' : lb.level === 'watch' ? 'Watch' : 'High',
      level: lb.level === 'high' ? 'alert' : lb.level === 'watch' ? 'watch' : 'good',
      message:
        lb.level === 'low'
          ? `Unfavourable for now — ${risk?.wetHours ?? 0}/${risk?.wetHoursToInfection ?? 10} wet-hours. Keep airflow up.`
          : lb.action,
    })
  }

  if (tuta) {
    items.push({
      id: 'tuta',
      icon: 'tuta',
      label: 'Tuta absoluta',
      value: tuta.pressure === 'low' ? 'Low' : tuta.pressure === 'watch' ? 'Watch' : 'High',
      level: tuta.pressure === 'high' ? 'alert' : tuta.pressure === 'watch' ? 'watch' : 'good',
      message: tuta.note,
    })
  }

  if (light) {
    const pct = Math.round((light.hoursAccumulated / light.hoursTarget) * 100)
    items.push({
      id: 'light',
      icon: 'light',
      label: 'Light this week',
      value: `${light.hoursAccumulated}/${light.hoursTarget} h`,
      level: pct >= 85 ? 'good' : pct >= 60 ? 'watch' : 'alert',
      message:
        pct >= 85
          ? 'On track for the weekly light target — strong, even fruiting.'
          : `Behind on light (${pct}%). Clean glazing or add supplemental light if it persists.`,
    })
  }

  return items.sort((a, b) => RANK[a.level] - RANK[b.level])
}
