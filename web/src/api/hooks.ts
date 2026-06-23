/** React Query hooks — one per endpoint. Screens consume only these. */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { TimeRange } from './types'

export const qk = {
  greenhouses: ['greenhouses'] as const,
  latest: (id: string) => ['latest', id] as const,
  suitability: (id: string, range: TimeRange) => ['suitability', id, range] as const,
  light: (id: string) => ['light', id] as const,
  risk: (id: string) => ['risk', id] as const,
  alerts: (id: string) => ['alerts', id] as const,
  recommendations: (id: string) => ['recommendations', id] as const,
  tuta: (id: string) => ['tuta', id] as const,
  detections: (id?: string) => ['detections', id ?? 'all'] as const,
  stats: ['stats'] as const,
  scanSummary: ['scanSummary'] as const,
  agronomist: (id: string) => ['agronomist', id] as const,
  plantingSuitability: (id: string) => ['plantingSuitability', id] as const,
}

export const useGreenhouses = () =>
  useQuery({ queryKey: qk.greenhouses, queryFn: api.greenhouses })

export const useLatest = (id: string) =>
  useQuery({
    queryKey: qk.latest(id),
    queryFn: () => api.latest(id),
    enabled: !!id,
    // live feel: poll the device feed every 10s
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })

export const useSuitability = (id: string, range: TimeRange) =>
  useQuery({
    queryKey: qk.suitability(id, range),
    queryFn: () => api.suitability(id, range),
    enabled: !!id,
  })

export const useLight = (id: string) =>
  useQuery({ queryKey: qk.light(id), queryFn: () => api.light(id), enabled: !!id })

export const useRisk = (id: string) =>
  useQuery({ queryKey: qk.risk(id), queryFn: () => api.risk(id), enabled: !!id })

export const useAlerts = (id: string) =>
  useQuery({ queryKey: qk.alerts(id), queryFn: () => api.alerts(id), enabled: !!id })

export const useRecommendations = (id: string) =>
  useQuery({
    queryKey: qk.recommendations(id),
    queryFn: () => api.recommendations(id),
    enabled: !!id,
  })

export const useTuta = (id: string) =>
  useQuery({ queryKey: qk.tuta(id), queryFn: () => api.tuta(id), enabled: !!id })

export const useDetections = (id?: string) =>
  useQuery({ queryKey: qk.detections(id), queryFn: () => api.detections(id) })

export const useStats = () => useQuery({ queryKey: qk.stats, queryFn: api.stats })

export const useScanSummary = () =>
  useQuery({ queryKey: qk.scanSummary, queryFn: api.scanSummary })

export const useAgronomist = (id: string) =>
  useQuery({ queryKey: qk.agronomist(id), queryFn: () => api.agronomist(id), enabled: !!id })

export const usePlantingSuitability = (id: string) =>
  useQuery({
    queryKey: qk.plantingSuitability(id),
    queryFn: () => api.plantingSuitability(id),
    enabled: !!id,
  })

export const useLeafScan = () =>
  useMutation({ mutationFn: (file: File) => api.leafScan(file) })
