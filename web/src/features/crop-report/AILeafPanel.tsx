import { useState } from 'react'
import { Leaf, ScanLine, AlertTriangle } from 'lucide-react'
import { HealthRing } from '@/components/ui/HealthRing'
import { TomatoLeaf } from '@/components/illustrations/TomatoLeaf'
import { SmartImage } from '@/components/ui/SmartImage'
import { Pill } from '@/components/ui/Pill'
import { LeafScanDialog } from './LeafScanDialog'
import type { Greenhouse, LeafScanResult } from '@/api/types'
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
 * Health-Score ring. "Scan a leaf" opens the camera/upload dialog, which returns
 * the diagnosis plus a specific farm action plan.
 */
export function AILeafPanel({ greenhouse }: { greenhouse: Greenhouse }) {
  const [scan, setScan] = useState<LeafScanResult>(DEFAULT_SCAN)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative mx-auto flex min-h-[440px] w-full max-w-[560px] flex-col items-center justify-center px-4 py-6">
      {/* soft lime glow + faint concentric halo behind the leaf */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,203,56,0.28),transparent_62%)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 opacity-70" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />

      <SmartImage
        src={['/images/tomato-leaf.png', '/images/tomato-leaf.jpg']}
        alt="Tomato leaf under AI analysis"
        fit="contain"
        className="relative z-10 h-[300px] w-[320px]"
        imgClassName="drop-shadow-[0_18px_40px_rgba(31,42,36,0.18)]"
        fallback={<TomatoLeaf className="relative z-10 h-[300px] w-auto" />}
      />

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
        <HealthRing value={scan.health_score} size={84} stroke={8} />
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

      {/* scan control */}
      <div className="absolute left-2 top-2 z-30 sm:left-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-lime inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition"
        >
          <ScanLine size={14} /> Scan a leaf
        </button>
      </div>

      {open && (
        <LeafScanDialog greenhouse={greenhouse} onClose={() => setOpen(false)} onResult={setScan} />
      )}
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
