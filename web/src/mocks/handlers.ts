/** MSW request handlers — map every API endpoint to the seeded tomato dataset. */
import { http, HttpResponse, delay } from 'msw'
import {
  GREENHOUSES,
  FARM_STATS,
  SCAN_SUMMARY,
  buildLatest,
  buildSuitability,
  buildLight,
  buildRisk,
  buildAlerts,
  buildRecommendations,
  buildTuta,
  buildDetections,
  buildAgronomist,
  buildPlanting,
} from './data'
import type { LeafScanResult, TimeRange } from '@/api/types'
import { LEAF_CLASS_LABELS } from '@/config/tomato'

const ranges: TimeRange[] = ['12h', '24h', '48h', 'week', 'month']
const asRange = (v: string | null): TimeRange =>
  ranges.includes(v as TimeRange) ? (v as TimeRange) : '12h'

export const handlers = [
  http.get('/greenhouses', () => HttpResponse.json(GREENHOUSES)),

  http.get('/greenhouses/:id/latest', ({ params }) =>
    HttpResponse.json(buildLatest(String(params.id))),
  ),

  http.get('/greenhouses/:id/series', ({ params, request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      buildSuitability(String(params.id), asRange(url.searchParams.get('range'))),
    )
  }),

  http.get('/greenhouses/:id/light', ({ params }) =>
    HttpResponse.json(buildLight(String(params.id))),
  ),

  http.get('/greenhouses/:id/risk', ({ params }) =>
    HttpResponse.json(buildRisk(String(params.id))),
  ),

  http.get('/greenhouses/:id/alerts', ({ params }) =>
    HttpResponse.json(buildAlerts(String(params.id))),
  ),

  http.get('/greenhouses/:id/recommendations', ({ params }) =>
    HttpResponse.json(buildRecommendations(String(params.id))),
  ),

  http.get('/greenhouses/:id/agronomist', ({ params }) =>
    HttpResponse.json(buildAgronomist(String(params.id))),
  ),

  http.get('/greenhouses/:id/planting-suitability', ({ params }) =>
    HttpResponse.json(buildPlanting(String(params.id))),
  ),

  http.get('/pests/tuta/:id', ({ params }) => HttpResponse.json(buildTuta(String(params.id)))),

  http.get('/scans/detections', ({ request }) => {
    const url = new URL(request.url)
    const gh = url.searchParams.get('greenhouse') ?? undefined
    return HttpResponse.json(buildDetections(gh))
  }),

  http.get('/stats', () => HttpResponse.json(FARM_STATS)),

  http.get('/scans/summary', () => HttpResponse.json(SCAN_SUMMARY)),

  /**
   * Mock leaf-scan. If the standalone FastAPI /ai service is running it will be
   * hit instead via the Vite proxy; this keeps the centre panel working offline.
   * Produces deterministic-but-varied output from the uploaded file size so the
   * UI visibly responds to different images.
   */
  http.post('/ai/leaf-scan', async ({ request }) => {
    await delay(900)
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    const size = file instanceof File ? file.size : 0
    const classes = Object.keys(LEAF_CLASS_LABELS) as (keyof typeof LEAF_CLASS_LABELS)[]
    const pick = classes[size % classes.length]
    const healthy = pick === 'Tomato_healthy'
    const chl = healthy ? 0.82 : 0.45 + ((size % 30) / 100)
    const glcm = healthy ? 0.21 : 0.55 + ((size % 25) / 100)
    const health = Math.round((healthy ? 0.9 : 0.45) * 100 - (glcm - 0.3) * 40)
    const result: LeafScanResult = {
      disease: pick,
      disease_label: LEAF_CLASS_LABELS[pick],
      confidence: 0.86 + ((size % 12) / 100),
      chl_index: Math.min(1, chl),
      glcm_level: Math.min(1, glcm),
      health_score: Math.max(0, Math.min(100, health)),
      severity: healthy ? 'none' : glcm > 0.7 ? 'high' : 'moderate',
      is_healthy: healthy,
      recommendation: healthy
        ? 'Healthy canopy — maintain temperature 21–27°C and RH 65–75%.'
        : `Detected ${LEAF_CLASS_LABELS[pick]}. Isolate the zone and apply the recommended treatment.`,
      scanned_at: new Date().toISOString(),
      model_version: 'mock-0.1.0',
    }
    return HttpResponse.json(result)
  }),
]
