/**
 * Typed API client. Every screen talks to the backend through these functions.
 * In dev they are intercepted by MSW (see src/mocks). In production they hit the
 * real FastAPI platform. The AI leaf-scan can also hit the standalone /ai service.
 */

import type {
  Alert,
  FarmStats,
  Greenhouse,
  LatestTelemetry,
  LeafScanResult,
  LightProgress,
  PlantingSuitability,
  Recommendation,
  RiskBundle,
  ScanSummary,
  SuitabilitySeries,
  TimeRange,
  TutaTracker,
  AgronomistCard,
  LeafDetection,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} — ${path}${body ? `: ${body}` : ''}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  greenhouses: () => http<Greenhouse[]>('/greenhouses'),

  latest: (id: string) => http<LatestTelemetry>(`/greenhouses/${id}/latest`),

  suitability: (id: string, range: TimeRange) =>
    http<SuitabilitySeries>(
      `/greenhouses/${id}/series?metric=climate_suitability&range=${range}`,
    ),

  light: (id: string) => http<LightProgress>(`/greenhouses/${id}/light`),

  risk: (id: string) => http<RiskBundle>(`/greenhouses/${id}/risk`),

  alerts: (id: string) => http<Alert[]>(`/greenhouses/${id}/alerts`),

  recommendations: (id: string) =>
    http<Recommendation[]>(`/greenhouses/${id}/recommendations`),

  tuta: (id: string) => http<TutaTracker>(`/pests/tuta/${id}`),

  detections: (id?: string) =>
    http<LeafDetection[]>(`/scans/detections${id ? `?greenhouse=${id}` : ''}`),

  stats: () => http<FarmStats>('/stats'),

  scanSummary: () => http<ScanSummary>('/scans/summary'),

  agronomist: (id: string) => http<AgronomistCard>(`/greenhouses/${id}/agronomist`),

  plantingSuitability: (id: string) =>
    http<PlantingSuitability>(`/greenhouses/${id}/planting-suitability`),

  /** POST a leaf image to the AI service for analysis. */
  leafScan: async (file: File): Promise<LeafScanResult> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/ai/leaf-scan`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Leaf scan failed: ${res.status}`)
    return res.json() as Promise<LeafScanResult>
  },
}
