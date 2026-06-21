/**
 * Vercel serverless function — tomato leaf/fruit/stem diagnosis via Google Gemini
 * (free tier). The API key lives ONLY here as a server env var (GEMINI_API_KEY),
 * never in the browser or the repo.
 *
 * Setup:
 *   1. Get a free key at https://aistudio.google.com/apikey
 *   2. Vercel → Project → Settings → Environment Variables → add GEMINI_API_KEY
 *   3. Redeploy. The dashboard's "Scan a leaf" will use Gemini automatically;
 *      if the key is missing or the call fails, the app falls back to the free
 *      on-device model.
 *
 * Request  (POST JSON): { imageBase64: string, mimeType?: string }
 * Response (JSON): { disease, disease_label, confidence, severity, is_healthy,
 *                    recommendation, alternatives:[{label,confidence}] }
 */

const CLASSES = [
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
]

const PROMPT = `You are an expert plant pathologist specializing in tomato (Solanum lycopersicum).
Analyze the photo of a tomato plant part (leaf, fruit, or stem) and identify the single most
likely condition, choosing exactly one id from this allowed set:
${CLASSES.join(', ')}.

Rules:
- Be calibrated: only give high confidence (>0.8) when symptoms are visually clear.
- If the image is not clearly a tomato plant, or is blurry/too far, pick the closest class but
  set confidence below 0.4 and say so in the recommendation.
- "Tuta_absoluta_damage" = irregular translucent leaf mines / blotch mines with frass.
- Give a concise, practical recommendation a Kenyan greenhouse farmer can act on (1-2 sentences).
- Provide up to 3 alternatives (other plausible conditions) with their confidences.`

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

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    const payload = {
      contents: [
        { parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
      },
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      res.status(502).json({ error: 'gemini_error', status: r.status, detail: detail.slice(0, 600) })
      return
    }
    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      res.status(502).json({ error: 'no_content', detail: JSON.stringify(data).slice(0, 600) })
      return
    }
    const parsed = JSON.parse(text)
    res.status(200).json(parsed)
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e).slice(0, 300) })
  }
}
