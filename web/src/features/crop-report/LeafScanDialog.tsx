import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Upload,
  X,
  Loader2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  Stethoscope,
} from 'lucide-react'
import { useLeafScan, useLatest } from '@/api/hooks'
import { classifyLeafSmart } from '@/lib/leafScan'
import { buildFarmActions, type FarmActionPlan, type Urgency } from '@/lib/farmAdvisor'
import { Pill } from '@/components/ui/Pill'
import type { Greenhouse, LeafScanResult } from '@/api/types'
import { cn } from '@/lib/cn'

type Step = 'choose' | 'camera' | 'analyzing' | 'result'

const URGENCY_TONE: Record<Urgency, string> = {
  now: 'bg-spectrum-red/10 text-spectrum-red',
  soon: 'bg-spectrum-amber/15 text-spectrum-amber',
  ongoing: 'bg-lime-tint text-health-deep',
}
const URGENCY_LABEL: Record<Urgency, string> = { now: 'Now', soon: 'Soon', ongoing: 'Ongoing' }

/**
 * Capture (camera or upload) → diagnose via /ai/leaf-scan → show the disease and
 * a specific, free, rule-based farm action plan (treat · adjust · maximize).
 */
export function LeafScanDialog({
  greenhouse,
  onClose,
  onResult,
}: {
  greenhouse: Greenhouse
  onClose: () => void
  onResult?: (r: LeafScanResult) => void
}) {
  const [step, setStep] = useState<Step>('choose')
  const [preview, setPreview] = useState<string>()
  const [result, setResult] = useState<LeafScanResult>()
  const [plan, setPlan] = useState<FarmActionPlan>()
  const [error, setError] = useState<string>()

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutate } = useLeafScan()
  const { data: latest } = useLatest(greenhouse.id)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  useEffect(() => () => stopCamera(), [])

  async function openCamera() {
    setError(undefined)
    if (!navigator.mediaDevices?.getUserMedia) {
      fileRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setStep('camera')
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setError('Camera unavailable or permission denied — upload a photo instead.')
    }
  }

  function finish(r: LeafScanResult) {
    setResult(r)
    setPlan(buildFarmActions(r, latest, greenhouse.growthStage))
    setStep('result')
    onResult?.(r)
  }

  async function analyze(file: File) {
    setPreview(URL.createObjectURL(file))
    stopCamera()
    setStep('analyzing')
    setError(undefined)
    try {
      // cloud vision AI first (Gemini), on-device model as automatic fallback
      finish(await classifyLeafSmart(file))
    } catch (e) {
      console.error('[leafModel] on-device inference failed, falling back to mock:', e)
      // fall back to the mock endpoint only if the model can't load/run
      mutate(file, {
        onSuccess: finish,
        onError: () => {
          setError('Scan failed — please try again.')
          setStep('choose')
        },
      })
    }
  }

  function capture() {
    const v = videoRef.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 640
    canvas.height = v.videoHeight || 480
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((b) => b && analyze(new File([b], 'leaf.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) analyze(f)
  }

  function reset() {
    stopCamera()
    setResult(undefined)
    setPlan(undefined)
    setPreview(undefined)
    setError(undefined)
    setStep('choose')
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-strong scroll-slim relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2 pr-8">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-lime-tint text-health-deep">
            <Stethoscope size={16} />
          </span>
          <div>
            <h3 className="text-base font-semibold leading-tight text-ink">Leaf disease scan</h3>
            <p className="text-[11px] text-sage">{greenhouse.name} · free on-device analysis</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-sage transition hover:bg-black/5 hover:text-ink"
        >
          <X size={18} />
        </button>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-inner bg-spectrum-red/10 p-2.5 text-xs text-spectrum-red">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {step === 'choose' && (
          <div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openCamera}
              className="flex flex-col items-center gap-2 rounded-inner border border-white/60 bg-white/50 p-6 text-center transition hover:bg-white/80"
            >
              <Camera size={26} className="text-health-deep" />
              <span className="text-sm font-semibold text-ink">Take a photo</span>
              <span className="text-[11px] text-sage">Use your camera</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-inner border border-white/60 bg-white/50 p-6 text-center transition hover:bg-white/80"
            >
              <Upload size={26} className="text-health-deep" />
              <span className="text-sm font-semibold text-ink">Upload a photo</span>
              <span className="text-[11px] text-sage">From your device</span>
            </button>
          </div>
            <p className="mt-3 text-center text-[11px] text-sage">
              For best accuracy: one leaf filling the frame, plain background, good light.
            </p>
          </div>
        )}

        {step === 'camera' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-full overflow-hidden rounded-inner bg-black/80">
              <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={capture}
                className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-white shadow-pill transition hover:brightness-95"
              >
                <Camera size={16} /> Capture & analyse
              </button>
              <button onClick={reset} className="rounded-full bg-white/70 px-4 py-2.5 text-sm font-medium text-sage hover:text-ink">
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-sage">Fill the frame with a single leaf, in good light.</p>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center gap-3 py-10">
            {preview && <img src={preview} alt="" className="h-32 w-32 rounded-inner object-cover" />}
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <Loader2 size={16} className="animate-spin text-health-deep" /> Analysing your photo with AI…
            </div>
            <p className="text-[11px] text-sage">Cloud AI when configured, otherwise the free on-device model.</p>
          </div>
        )}

        {step === 'result' && result && plan && (
          <div className="flex flex-col gap-4">
            {/* diagnosis */}
            <div className="flex gap-3">
              {preview && <img src={preview} alt="Scanned leaf" className="h-24 w-24 shrink-0 rounded-inner object-cover ring-1 ring-white/60" />}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {plan.healthy ? (
                    <CheckCircle2 size={18} className="text-health-deep" />
                  ) : (
                    <AlertTriangle size={18} className="text-spectrum-amber" />
                  )}
                  <span className="text-lg font-bold text-ink">{result.disease_label}</span>
                  <Pill tone={plan.healthy ? 'lime' : result.severity === 'high' ? 'red' : 'amber'}>
                    {Math.round(result.confidence * 100)}%
                  </Pill>
                </div>
                <p className="mt-1 text-xs text-sage">{plan.headline}</p>
                <div className="mt-2 flex gap-3 text-[11px] text-sage">
                  <span>Chl <b className="text-ink">{result.chl_index.toFixed(3)}</b></span>
                  <span>GLCM <b className="text-ink">{result.glcm_level.toFixed(3)}</b></span>
                  <span>Health <b className="text-ink">{result.health_score}%</b></span>
                </div>
              </div>
            </div>

            {result.low_confidence && (
              <div className="flex items-start gap-2 rounded-inner bg-spectrum-amber/15 p-3 text-xs text-ink">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-spectrum-amber" />
                <span>
                  <b>Unsure about this one.</b> For a reliable result, photograph a single leaf
                  filling the frame, on a plain background, in good light — then scan again.
                </span>
              </div>
            )}

            {result.alternatives && result.alternatives.length > 0 && (
              <div className="rounded-inner bg-white/45 p-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sage">
                  Other possibilities
                </div>
                <ul className="space-y-1">
                  {result.alternatives.map((a, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-ink">
                      <span className="truncate">{a.label}</span>
                      <span className="ml-2 tabular-nums text-sage">
                        {Math.round(a.confidence * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.immediate.length > 0 && (
              <Section icon={Stethoscope} title="Treat it now" tone="text-spectrum-red">
                {plan.immediate.map((t, i) => (
                  <Bullet key={i} tone="bg-spectrum-red">{t}</Bullet>
                ))}
              </Section>
            )}

            <Section icon={Sliders} title="Adjust your environment" tone="text-spectrum-amber">
              {plan.environment.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-sage">
                  <span className={cn('mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold', URGENCY_TONE[a.urgency])}>
                    {URGENCY_LABEL[a.urgency]}
                  </span>
                  <span>{a.text}</span>
                </li>
              ))}
            </Section>

            <Section icon={ShieldCheck} title="Maximize healthy yield" tone="text-health-deep">
              {plan.maximize.map((t, i) => (
                <Bullet key={i} tone="bg-health-deep">{t}</Bullet>
              ))}
            </Section>

            <div className="flex gap-2 pt-1">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              >
                <RotateCcw size={15} /> Scan another
              </button>
              <button onClick={onClose} className="rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-sage hover:text-ink">
                Done
              </button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Stethoscope
  title: string
  tone: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-inner bg-white/45 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon size={15} className={tone} />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink">{title}</span>
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  )
}

function Bullet({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <li className="flex items-start gap-2 text-[12px] leading-snug text-sage">
      <span className={cn('mt-1.5 h-1 w-1 shrink-0 rounded-full', tone)} />
      <span>{children}</span>
    </li>
  )
}
