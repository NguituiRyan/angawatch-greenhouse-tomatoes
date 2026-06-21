/**
 * Vercel serverless function — tomato leaf/fruit/stem diagnosis via Google Gemini
 * (free tier), PERSONALISED with the greenhouse's live node-sensor readings.
 * The API key lives ONLY here as a server env var (GEMINI_API_KEY).
 *
 * Setup: get a free key at https://aistudio.google.com/apikey, add GEMINI_API_KEY
 * in Vercel → Settings → Environment Variables, redeploy. The app falls back to
 * the free on-device model if the key is missing or the call fails.
 *
 * Request (POST JSON):
 *   { imageBase64, mimeType?, sensors?: {airTempC,relativeHumidityPct,soilMoisturePct,
 *     leafWetnessPct,co2Ppm,soilPh,ecDsPerM}, crop?, growthStage?, daysFromTransplant? }
 */

const CLASSES = [
  'Tomato_healthy', 'Tomato_Bacterial_spot', 'Tomato_Early_blight', 'Tomato_Late_blight',
  'Tomato_Leaf_Mold', 'Tomato_Septoria_leaf_spot', 'Tomato_Spider_mites_two_spotted',
  'Tomato_Target_Spot', 'Tomato_Yellow_Leaf_Curl_Virus', 'Tomato_mosaic_virus',
  'Tuta_absoluta_damage',
]

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    disease: { type: 'STRING', enum: CLASSES },
    disease_label: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    severity: { type: 'STRING', enum: ['none', 'low', 'moderate', 'high'] },
    is_healthy: { type: 'BOOLEAN' },
    recommendation: { type: 'STRING' },
    alternatives: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { label: { type: 'STRING' }, confidence: { type: 'NUMBER' } },
        required: ['label', 'confidence'],
      },
    },
  },
  required: ['disease', 'disease_label', 'confidence', 'severity', 'is_healthy', 'recommendation'],
}

function buildPrompt(body) {
  const { sensors, crop, growthStage, daysFromTransplant } = body
  let ctx = ''
  if (sensors && typeof sensors === 'object') {
    const parts = [
      sensors.airTempC != null && `air temp ${sensors.airTempC}°C`,
      sensors.relativeHumidityPct != null && `relative humidity ${sensors.relativeHumidityPct}%`,
      sensors.soilMoisturePct != null && `soil moisture ${sensors.soilMoisturePct}%`,
      sensors.leafWetnessPct != null && `leaf wetness ${sensors.leafWetnessPct}%`,
      sensors.co2Ppm != null && `CO2 ${sensors.co2Ppm} ppm`,
      sensors.soilPh != null && `soil pH ${sensors.soilPh}`,
      sensors.ecDsPerM != null && `fertigation EC ${sensors.ecDsPerM} dS/m`,
    ].filter(Boolean)
    if (parts.length) {
      ctx =
        `\n\nThis greenhouse's LIVE node-sensor readings right now: ${parts.join(', ')}.` +
        (crop ? ` Crop: ${crop}.` : '') +
        (growthStage ? ` Growth stage: ${growthStage}.` : '') +
        (daysFromTransplant != null ? ` Day ${daysFromTransplant} from transplant.` : '') +
        `\nTomato optima: air 21-27°C, RH 65-75%, soil moisture 60-80%. ` +
        `In "recommendation", connect these specific readings to the disease risk and give ` +
        `prioritised, personalised actions for THIS greenhouse (e.g. how much to ventilate to ` +
        `reach the target RH, irrigation/fertigation tweaks, and timing for the growth stage).`
    }
  }
  return (
    `You are an expert plant pathologist specializing in tomato (Solanum lycopersicum) for a ` +
    `Kenyan greenhouse. Identify the single most likely condition from this allowed set: ` +
    `${CLASSES.join(', ')}.\n` +
    `Be calibrated: only give confidence >0.8 when symptoms are clearly visible; if the image ` +
    `is not clearly a tomato plant or is blurry, pick the closest class but set confidence <0.4 ` +
    `and say so. "Tuta_absoluta_damage" = irregular translucent leaf mines with frass. Provide ` +
    `up to 3 alternatives with confidences.` +
    ctx
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' })
    return
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    res.status(503).json({ error: 'GEMINI_API_KEY not configured' })
    return
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { imageBase64, mimeType = 'image/jpeg' } = body
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' })
      return
    }

    // Try current free-tier models in order; free tier rotates between versions.
    const models = [...new Set([
      process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest',
      'gemini-1.5-flash',
    ].filter(Boolean))]

    const payload = {
      contents: [
        { parts: [{ text: buildPrompt(body) }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] },
      ],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }

    let last = { status: 0, model: '', detail: '' }
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const data = await r.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          parsed.model_used = model
          res.status(200).json(parsed)
          return
        }
        last = { status: 502, model, detail: 'empty response' }
        continue
      }
      const detail = await r.text().catch(() => '')
      last = { status: r.status, model, detail: detail.slice(0, 300) }
      // only keep trying on quota / model-not-found; stop on real request errors
      if (![429, 404, 403].includes(r.status)) break
    }
    res.status(502).json({ error: 'gemini_error', ...last })
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e).slice(0, 300) })
  }
}
