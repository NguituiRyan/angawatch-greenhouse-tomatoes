# NOTES — done vs. stubbed

_Last verified: 2026-06-20. Web app: `npm run build` ✅ (tsc --noEmit clean, Vite build
exit 0), runs at localhost:5173, no console errors. Crop Report + Pest & Disease verified
in-browser at mobile and desktop widths. Python: `py_compile` clean on all modules._

## ✅ Done (working)

### Web dashboard
- Vite + React + TS + Tailwind scaffold; design tokens extracted from the 3 reference
  screenshots into `tailwind.config.js` + `index.css` (glass surface, lime accent,
  spectrum gradient, radii, Inter type scale).
- Full design-system primitives in `src/components/ui/`.
- **Crop Report** screen — all widgets, 3-column layout matching the reference,
  responsive stack on small screens.
- **Pest & Disease** screen — built fully: late-blight wet-hours gauge, Tuta
  degree-day + trap-trend (Recharts), AI detections feed, recommendations,
  per-greenhouse pressure grid.
- **AI Leaf Panel** — radial callouts (Chl / GLCM / Health-Score ring) + live image
  upload that calls `POST /ai/leaf-scan` (mock or real service).
- Typed API client (`src/api`) + TanStack Query hooks for every endpoint.
- **MSW mock layer** (`src/mocks`) seeded with deterministic, realistic tomato data
  (seeded PRNG → stable values echoing the design: 97% in-range, +15%, 139/160h,
  0.783 Chl, 0.689 GLCM, 80% health, 3,256 plants, etc.).
- Agronomy constants (`src/config/tomato.ts`) — optima, NPK-by-stage, growth stages,
  disease triggers, Tuta model — all tunable.

### AI service (`ai/`)
- FastAPI app, CORS, `GET /health`, `POST /ai/leaf-scan` matching the typed contract.
- **Real** chlorophyll (greenness index) + GLCM texture computed from the uploaded
  image; disease class mocked deterministically (stable per image), with a documented
  seam to drop in a real TFLite/ONNX model.

### ML pipeline (`ml/`)
- `config.py` (11 classes incl. custom Tuta), `download_data.py`, `leaf_metrics.py`,
  `model.py` (MobileNetV3/EfficientNet transfer learning), `train.py` (two-phase
  training, class weights, callbacks, confusion matrix), `export.py` (TFLite + ONNX).

### Leaf disease AI (real, free, on-device)
- The "Scan a leaf" camera/upload now runs **real inference in the browser** via
  `onnxruntime-web` using the open PlantVillage EfficientNetV2-S model
  (`baovm/plantvillage-efficientnetv2s`, 38 classes incl. all 10 tomato classes),
  streamed from the Hugging Face CDN and cached — no server, no API key, no cost.
  Chlorophyll + GLCM are computed from the real pixels. Verified: correct on
  labelled late/early blight, septoria, yellow-leaf-curl images. See
  `web/src/lib/leafModel.ts`. The mock `/ai` endpoint remains only as a fallback.

## 🟡 Stubbed / mocked (intentionally, per brief)
- **First scan downloads ~80 MB** (the float32 model — the int8 build uses ops
  onnxruntime-web can't run). Tuta absoluta has no class in this model (not in
  PlantVillage); collect field images and fine-tune to add it.
- **No real dataset / weights** — `ml/` downloads & trains on demand; the
  `Tuta_absoluta_damage` class needs field-collected images (TODO in `download_data.py`).
- **Management** tab: live microclimate tiles only. Scheduling, crews, fertigation
  recipes, alerts acknowledgement, and **M-Pesa billing** are not implemented.
- **Backend** is mocked via MSW. The typed client is drop-in for the real FastAPI
  platform (`VITE_API_BASE`); the predictive risk engine values are mock-computed
  client-side rather than served.
- **Aerial map & leaf** are crafted SVG illustrations (self-contained, offline-safe)
  rather than photography, to avoid external image dependencies.
- **Auth / multi-tenant / real notifications** — not in scope here.

## ▶️ Suggested next steps
1. Collect & label `Tuta_absoluta_damage` images; run `ml/train.py`, then point
   `ai/` at the exported model (set `LEAF_MODEL_PATH`).
2. Replace MSW handlers with the live FastAPI platform endpoints (same contract).
3. Flesh out the Management tab (scheduling, fertigation recipes, M-Pesa billing).
4. Add unit tests (Vitest) for the suitability/risk derivations and API hooks.
5. Code-split the bundle (Recharts) to clear the 500 kB chunk advisory.
