/**
 * Cloud vision-AI leaf scan via the /api/leaf-scan serverless function (Google
 * Gemini, free tier). Most accurate on real field photos and needs no training.
 * The API key stays server-side; the browser only talks to our own endpoint.
 *
 * Throws if the endpoint is unavailable / not configured, so the caller can fall
 * back to the on-device model.
 */
import type { LeafScanResult, Severity } from '@/api/types'
import { LEAF_CLASSES, LEAF_CLASS_LABELS, type LeafClass } from '@/config/tomato'
import { computeLeafMetrics } from './leafModel'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const SEV_BASE: Record<Severity, number> = { none: 92, low: 72, moderate: 52, high: 32 }

/** Downscale to keep the upload small/fast, return raw base64 (no data: prefix). */
async function toBase64(file: File, max = 768): Promise<string> {
  const bmp = await createImageBitmap(file).catch(() => null)
  let canvas: HTMLCanvasElement
  if (bmp) {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  } else {
    // fallback via <img>
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = URL.createObjectURL(file)
    })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  }
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

export async function classifyLeafViaLLM(file: File): Promise<LeafScanResult> {
  const imageBase64 = await toBase64(file)
  const res = await fetch('/api/leaf-scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
  })
  if (!res.ok) throw new Error(`cloud AI unavailable (${res.status})`)
  const g = await res.json()

  // metrics are computed locally from the real pixels (the LLM doesn't measure them)
  const { chl, glcm } = await computeLeafMetrics(file)

  const cls: LeafClass = LEAF_CLASSES.includes(g.disease) ? g.disease : 'Tomato_healthy'
  const healthy = g.is_healthy === true || cls === 'Tomato_healthy'
  const severity: Severity = ['none', 'low', 'moderate', 'high'].includes(g.severity)
    ? g.severity
    : healthy
      ? 'none'
      : 'moderate'
  const confidence = clamp01(typeof g.confidence === 'number' ? g.confidence : 0.8)
  const health = Math.max(
    0,
    Math.min(100, Math.round((SEV_BASE[severity] ?? 55) + (chl - 0.5) * 20 - (glcm - 0.3) * 15)),
  )

  return {
    disease: cls,
    disease_label: LEAF_CLASS_LABELS[cls] ?? g.disease_label ?? 'Unknown',
    confidence,
    chl_index: chl,
    glcm_level: glcm,
    health_score: health,
    severity,
    is_healthy: healthy,
    recommendation: g.recommendation || 'See the action plan below.',
    scanned_at: new Date().toISOString(),
    model_version: 'gemini-vision',
    alternatives: Array.isArray(g.alternatives)
      ? g.alternatives.slice(0, 3).map((a: { label?: string; confidence?: number }) => ({
          label: String(a.label ?? ''),
          confidence: clamp01(Number(a.confidence) || 0),
        }))
      : undefined,
    low_confidence: confidence < 0.5,
  }
}
