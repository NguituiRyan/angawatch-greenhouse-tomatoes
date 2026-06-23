/**
 * POST /api/ingest — receive a live sensor reading from a field node (ESP32 + modem).
 *
 * Auth: if INGEST_KEY is set in Vercel env, the device must send it as the
 * `x-api-key` header OR a `?key=` query param. If unset, the endpoint is open
 * (fine for a quick demo).
 *
 * Body (JSON) — send whatever the node has; field aliases are accepted:
 *   { greenhouseId|gh, airTempC|temp|t, relativeHumidityPct|humidity|hum|h,
 *     soilMoisturePct|soil, soilRaw, ecDsPerM|ec, soilPh|ph, co2Ppm|co2,
 *     leafWetnessPct }
 */
import { storeSet, storeBackend } from './_store.js'

const num = (v) =>
  v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' })
    return
  }
  const key = process.env.INGEST_KEY
  const provided = req.headers['x-api-key'] || (req.query && req.query.key)
  if (key && provided !== key) {
    res.status(401).json({ error: 'invalid key' })
    return
  }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const gh = String(b.greenhouseId || b.gh || 'GH-01')
    const reading = {
      greenhouseId: gh,
      timestamp: new Date().toISOString(),
      airTempC: num(b.airTempC ?? b.temp ?? b.t),
      relativeHumidityPct: num(b.relativeHumidityPct ?? b.humidity ?? b.hum ?? b.h),
      soilMoisturePct: num(b.soilMoisturePct ?? b.soil),
      soilRaw: num(b.soilRaw ?? b.soil_raw),
      ecDsPerM: num(b.ecDsPerM ?? b.ec),
      soilPh: num(b.soilPh ?? b.ph),
      co2Ppm: num(b.co2Ppm ?? b.co2),
      leafWetnessPct: num(b.leafWetnessPct),
      source: 'device',
    }
    // keep only the fields the node actually sent
    const clean = Object.fromEntries(Object.entries(reading).filter(([, v]) => v !== null))
    await storeSet(`gh:latest:${gh}`, clean)
    res.status(200).json({ ok: true, backend: storeBackend, stored: clean })
  } catch (e) {
    res.status(400).json({ error: 'bad_request', detail: String(e).slice(0, 200) })
  }
}
