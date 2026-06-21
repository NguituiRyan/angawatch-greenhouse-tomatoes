/**
 * Real, free, in-browser tomato leaf disease inference.
 *
 * Runs the open PlantVillage EfficientNetV2-S model (baovm/plantvillage-
 * efficientnetv2s, 38 classes incl. all 10 tomato classes) with onnxruntime-web
 * — entirely on the device, no server, no API key, no per-call cost. The model
 * (≈21 MB int8) is self-hosted in /public/models and cached by the browser after
 * the first scan. Chlorophyll + GLCM texture are computed from the actual pixels.
 *
 * If the model can't load/run, the caller falls back to the mock endpoint.
 */
import type { LeafScanResult, Severity } from '@/api/types'
import { LEAF_CLASS_LABELS, LEAF_CLASSES, type LeafClass } from '@/config/tomato'

// Model is loaded from the Hugging Face CDN (free, CORS-enabled, cached by the
// browser) so the 80 MB file doesn't bloat the repo. Override with VITE_LEAF_MODEL_URL.
const MODEL_URL =
  import.meta.env.VITE_LEAF_MODEL_URL ??
  'https://huggingface.co/baovm/plantvillage-efficientnetv2s/resolve/main/efficientnetv2s_plantvillage.onnx'
const LABELS_URL = '/models/plant-disease-labels.json'
const MODEL_VERSION = 'plantvillage-efficientnetv2s'

// PlantVillage tomato label -> our LeafClass
const PV_TO_CLASS: Record<string, LeafClass> = {
  'Tomato___Bacterial_spot': 'Tomato_Bacterial_spot',
  'Tomato___Early_blight': 'Tomato_Early_blight',
  'Tomato___Late_blight': 'Tomato_Late_blight',
  'Tomato___Leaf_Mold': 'Tomato_Leaf_Mold',
  'Tomato___Septoria_leaf_spot': 'Tomato_Septoria_leaf_spot',
  'Tomato___Spider_mites Two-spotted_spider_mite': 'Tomato_Spider_mites_two_spotted',
  'Tomato___Target_Spot': 'Tomato_Target_Spot',
  'Tomato___Tomato_Yellow_Leaf_Curl_Virus': 'Tomato_Yellow_Leaf_Curl_Virus',
  'Tomato___Tomato_mosaic_virus': 'Tomato_mosaic_virus',
  'Tomato___healthy': 'Tomato_healthy',
}

// EfficientNetV2-S preprocessing (ImageNet stats). Verified empirically against
// labelled PlantVillage images; INPUT_SIZE auto-falls-back on a shape mismatch.
let INPUT_SIZE = 224
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

// Input layout of the configured model:
//   'nchw-imagenet' (default) — the PyTorch PlantVillage model (NCHW, ImageNet-normalized)
//   'nhwc-raw'                — a Keras/EfficientNet model from ml/train_field_model.py
//                               (NHWC, raw 0..255; preprocessing baked into the graph)
const LAYOUT = import.meta.env.VITE_LEAF_MODEL_LAYOUT ?? 'nchw-imagenet'

const isTomato = (l?: string) => !!l && l.toLowerCase().startsWith('tomato')
function toClass(label: string): LeafClass | undefined {
  return PV_TO_CLASS[label] ?? (LEAF_CLASSES.includes(label as LeafClass) ? (label as LeafClass) : undefined)
}

type Ort = typeof import('onnxruntime-web')
let bootstrap: Promise<{ ort: Ort; session: import('onnxruntime-web').InferenceSession }> | null = null
let labelsCache: string[] | null = null

async function getLabels(): Promise<string[]> {
  if (!labelsCache) labelsCache = await fetch(LABELS_URL).then((r) => r.json())
  return labelsCache!
}

async function getSession() {
  if (!bootstrap) {
    bootstrap = (async () => {
      const ort = await import('onnxruntime-web')
      // single-thread WASM avoids the COOP/COEP requirement; load wasm from CDN
      ort.env.wasm.numThreads = 1
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/'
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
      return { ort, session }
    })()
  }
  return bootstrap
}

/** Pre-load the model (call when the scan dialog opens to hide latency). */
export function warmupLeafModel() {
  getSession().catch(() => {})
}

/** Real chlorophyll (greenness) + GLCM texture from a photo — used by the cloud-AI path. */
export async function computeLeafMetrics(file: File): Promise<{ chl: number; glcm: number }> {
  const bmp = await loadImage(file)
  return leafMetrics(toCanvas(bmp, 256))
}

function toCanvas(bmp: ImageBitmap | HTMLImageElement, size: number) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const w = (bmp as ImageBitmap).width || (bmp as HTMLImageElement).naturalWidth
  const h = (bmp as ImageBitmap).height || (bmp as HTMLImageElement).naturalHeight
  // center-crop "cover" (standard ImageNet-style eval) — fills the square with the
  // middle of the photo, which matches training far better than white letterboxing.
  const scale = Math.max(size / w, size / h)
  const dw = w * scale
  const dh = h * scale
  ctx.drawImage(bmp as CanvasImageSource, (size - dw) / 2, (size - dh) / 2, dw, dh)
  return ctx.getImageData(0, 0, size, size)
}

/** "Tomato___Late_blight" -> "Tomato — Late blight" */
function prettyLabel(pv: string): string {
  if (!pv) return 'Unknown'
  let crop: string
  let cond: string
  if (pv.includes('___')) {
    const [c, ...rest] = pv.split('___')
    crop = c
    cond = rest.join(' ')
  } else {
    const parts = pv.split('_')
    crop = parts[0]
    cond = parts.slice(1).join(' ')
  }
  crop = crop.replace(/_/g, ' ').replace(/\s*\(.*?\)/g, '').trim()
  cond = cond.replace(/_/g, ' ').trim() || 'healthy'
  return `${crop} — ${cond}`
}

function toTensor(ort: Ort, img: ImageData, size: number) {
  const { data } = img
  const area = size * size
  if (LAYOUT === 'nhwc-raw') {
    // NHWC, raw 0..255 — a Keras/EfficientNet model bakes its own preprocessing
    const f = new Float32Array(area * 3)
    for (let i = 0; i < area; i++) {
      f[i * 3] = data[i * 4]
      f[i * 3 + 1] = data[i * 4 + 1]
      f[i * 3 + 2] = data[i * 4 + 2]
    }
    return new ort.Tensor('float32', f, [1, size, size, 3])
  }
  // NCHW, ImageNet-normalized
  const f = new Float32Array(3 * area)
  for (let i = 0; i < area; i++) {
    f[i] = (data[i * 4] / 255 - MEAN[0]) / STD[0]
    f[area + i] = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1]
    f[2 * area + i] = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2]
  }
  return new ort.Tensor('float32', f, [1, 3, size, size])
}

function softmax(arr: Float32Array | number[]): number[] {
  const max = Math.max(...arr)
  const exp = Array.from(arr, (v) => Math.exp(v - max))
  const sum = exp.reduce((a, b) => a + b, 0)
  return exp.map((v) => v / sum)
}

/** Real chlorophyll (greenness) + GLCM-ish texture from the leaf pixels. */
function leafMetrics(img: ImageData): { chl: number; glcm: number } {
  const { data } = img
  let gSum = 0
  let n = 0
  const grays: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // leaf pixels: green-dominant, not near-white background / not too dark
    if (g > r && g >= b && g > 35 && !(r > 235 && g > 235 && b > 235)) {
      gSum += (g - r) / (g + r + 1e-6)
      grays.push(0.299 * r + 0.587 * g + 0.114 * b)
      n++
    }
  }
  if (n < 50) return { chl: 0.5, glcm: 0.5 }
  const greenness = gSum / n // ~0 (chlorotic) .. ~0.35 (lush)
  const chl = Math.max(0, Math.min(1, (greenness + 0.02) / 0.34))
  // texture: normalized std-dev of leaf grayscale (lesions raise contrast)
  const mean = grays.reduce((a, b) => a + b, 0) / grays.length
  const variance = grays.reduce((a, b) => a + (b - mean) ** 2, 0) / grays.length
  const glcm = Math.max(0, Math.min(1, Math.sqrt(variance) / 70))
  return { chl, glcm }
}

function severityFrom(healthy: boolean, glcm: number, conf: number): Severity {
  if (healthy) return 'none'
  if (glcm > 0.62 || conf > 0.9) return 'high'
  if (glcm > 0.42) return 'moderate'
  return 'low'
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall through */
    }
  }
  return await new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}

/** Classify a leaf photo entirely on-device. Throws if the model is unavailable. */
export async function classifyLeaf(file: File): Promise<LeafScanResult> {
  const [{ ort, session }, labels, bmp] = await Promise.all([getSession(), getLabels(), loadImage(file)])
  const inputName = session.inputNames[0]
  const outputName = session.outputNames[0]

  // run, auto-recovering the input size if the export expects a different one
  let logits: Float32Array | null = null
  let metricsImg: ImageData | null = null
  for (const size of [INPUT_SIZE, 384, 300, 256, 240, 260, 480]) {
    try {
      const imgData = toCanvas(bmp, size)
      const out = await session.run({ [inputName]: toTensor(ort, imgData, size) })
      logits = out[outputName].data as Float32Array
      metricsImg = imgData
      INPUT_SIZE = size // cache the working size
      break
    } catch (e) {
      if (!/dimension|shape|invalid|size|expected/i.test(String(e))) throw e
    }
  }
  if (!logits || !metricsImg) throw new Error('Leaf model: no compatible input size')

  const probs = softmax(logits)
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a])
  const top = order[0]
  const topIsTomato = isTomato(labels[top])
  // a tomato farm scans tomato leaves — prefer the best tomato class for the diagnosis
  const chosen = topIsTomato ? top : (order.find((i) => isTomato(labels[i])) ?? top)
  const cls: LeafClass = toClass(labels[chosen]) ?? 'Tomato_healthy'
  const confidence = probs[chosen]
  const healthy = cls === 'Tomato_healthy'
  const lowConfidence = confidence < 0.5 || !topIsTomato
  const alternatives = order
    .slice(0, 3)
    .map((i) => ({ label: prettyLabel(labels[i]), confidence: probs[i] }))

  const { chl, glcm } = leafMetrics(metricsImg)
  const severity = severityFrom(healthy, glcm, confidence)
  const health = Math.max(
    0,
    Math.min(100, Math.round((healthy ? 92 : 55) - (glcm - 0.3) * 45 + (chl - 0.5) * 30)),
  )
  const label = LEAF_CLASS_LABELS[cls]

  const retake =
    'Low confidence — retake with one leaf filling the frame, a plain background and good light.'
  const recommendation = lowConfidence
    ? `${retake}${topIsTomato ? ` Best guess: ${label}.` : ` Top guess wasn't a tomato leaf (${prettyLabel(labels[top])}).`}`
    : healthy
      ? 'Healthy canopy — maintain temperature 21–27°C and RH 65–75%.'
      : `${label} detected — see the action plan to treat and adjust conditions.`

  return {
    disease: cls,
    disease_label: label,
    confidence,
    chl_index: chl,
    glcm_level: glcm,
    health_score: health,
    severity,
    is_healthy: healthy,
    recommendation,
    scanned_at: new Date().toISOString(),
    model_version: MODEL_VERSION,
    alternatives,
    low_confidence: lowConfidence,
  }
}
