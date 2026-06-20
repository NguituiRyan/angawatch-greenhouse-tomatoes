import { useRef, useState } from 'react'
import { Leaf, Upload, Loader2, AlertTriangle } from 'lucide-react'
import { HealthRing } from '@/components/ui/HealthRing'
import { TomatoLeaf } from '@/components/illustrations/TomatoLeaf'
import { Pill } from '@/components/ui/Pill'
import { useLeafScan } from '@/api/hooks'
import type { LeafScanResult } from '@/api/types'
import { cn } from '@/lib/cn'

const DEFAULT_SCAN: LeafScanResult = {
  disease: 'Tomato_healthy',
  disease_label: 'Healthy',
  confidence: 0.95,
  chl_index: 0.783,
  glcm_level: 0.689,
  health_score: 80,
  severity: 'none',
  is_healthy: true,
  recommendation: 'Healthy canopy — maintain temperature 21–27°C and RH 65–75%.',
  scanned_at: '2026-06-17T10:32:00Z',
  model_version: 'mock-0.1.0',
}

/**
 * The AI Tomato-Leaf Vision panel: a leaf with radial callout tags driven by the
 * model output — chlorophyll index ("Chl"), GLCM texture/severity, and the
 * Health-Score ring. Upload a leaf photo to run a live scan (POST /ai/leaf-scan).
 */
export function AILeafPanel() {
  const [scan, setScan] = useState<LeafScanResult>(DEFAULT_SCAN)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate, isPending } = useLeafScan()

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    mutate(file, { onSuccess: setScan })
  }

  return (
    <div className="relative mx-auto flex min-h-[440px] w-full max-w-[560px] flex-col items-center justify-center px-4 py-6">
      {/* faint concentric halo behind the leaf */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 opacity-70" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />

      <TomatoLeaf className="relative z-10 h-[300px] w-auto" />

      {/* callout: chlorophyll index ("Leaf · Chl") */}
      <Callout className="left-1/2 top-2 -translate-x-1/4 sm:left-[58%]">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-inner bg-lime-tint text-health-deep">
            <Leaf size={16} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">Leaf</div>
            <div className="text-xs text-sage">{scan.chl_index.toFixed(3)} Chl</div>
          </div>
        </div>
      </Callout>

      {/* callout: GLCM texture / severity */}
      <Callout className="left-0 top-1/2 sm:left-2">
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">{scan.glcm_level.toFixed(3)} Chl</div>
          <div className="text-xs text-sage">Chl GLCM Level</div>
        </div>
      </Callout>

      {/* Health-Score ring */}
      <div className="absolute bottom-4 right-2 z-20 sm:right-6">
        <HealthRing value={scan.health_score} size={108} />
      </div>

      {/* disease banner when not healthy */}
      {!scan.is_healthy && (
        <div className="absolute bottom-4 left-2 z-20 max-w-[230px] rounded-inner bg-white/85 p-3 shadow-glass backdrop-blur sm:left-4">
          <div className="mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-spectrum-amber" />
            <span className="text-sm font-semibold text-ink">{scan.disease_label}</span>
            <Pill tone={scan.severity === 'high' ? 'red' : 'amber'} className="ml-auto">
              {Math.round(scan.confidence * 100)}%
            </Pill>
          </div>
          <p className="text-[11px] leading-snug text-sage">{scan.recommendation}</p>
        </div>
      )}

      {/* upload control */}
      <div className="absolute right-2 top-2 z-30 sm:right-4">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="glass-strong inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-ink transition hover:text-health-deep disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isPending ? 'Analysing…' : 'Scan leaf'}
        </button>
      </div>
    </div>
  )
}

function Callout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-strong absolute z-20 rounded-inner px-3 py-2 shadow-glass animate-fade-in', className)}>
      {children}
    </div>
  )
}
