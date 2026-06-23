/**
 * GET /api/latest?gh=GH-01 — the dashboard reads the most recent live reading.
 * Returns 404 when no device has posted yet (the app then shows demo data).
 * Missing fields (e.g. EC before the probe is fitted) are filled with sensible
 * placeholders so the UI stays complete; real device fields override them.
 */
import { storeGet } from './_store.js'

const DEFAULTS = {
  co2Ppm: 600,
  soilPh: 6.5,
  ecDsPerM: 2.6,
  leafWetnessPct: 12,
  soilMoisturePct: 70,
  inOptimalRangePct: 95,
}

export default async function handler(req, res) {
  const gh = String((req.query && (req.query.gh || req.query.greenhouseId)) || 'GH-01')
  const raw = await storeGet(`gh:latest:${gh}`)
  if (!raw) {
    res.status(404).json({ error: 'no_data', greenhouseId: gh })
    return
  }
  let reading = null
  try {
    reading = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    reading = null
  }
  if (!reading || reading.airTempC == null) {
    res.status(404).json({ error: 'no_data', greenhouseId: gh })
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ...DEFAULTS, ...reading })
}
