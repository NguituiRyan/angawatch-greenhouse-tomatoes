# AngaWatch — Greenhouse Tomato Intelligence

A smart-greenhouse, crop-loss-prevention platform for tomato farmers in Kenya.
This repo holds the **web dashboard**, a **mock AI leaf-scan service**, and the
**ML training pipeline** for the tomato-leaf vision model.

> Rebrand of the reference "AgricAI" design, re-themed end-to-end for a **tomato
> greenhouse** context (greenhouses/zones, transplant→harvest, agronomist,
> disease & pest). Frosted-glass aesthetic preserved faithfully.

```
.
├── web/   React + TypeScript + Vite dashboard (Crop Report · Pest & Disease · Management)
├── ai/    FastAPI mock inference service — POST /ai/leaf-scan
├── ml/    PlantVillage transfer-learning pipeline (MobileNetV3 / EfficientNet) + TFLite/ONNX export
├── README.md
└── NOTES.md   what's done vs. stubbed
```

---

## 1. Web dashboard (`web/`)

React 18 · TypeScript · Vite 5 · Tailwind 3 · TanStack Query · Recharts · lucide-react · MSW.

```bash
cd web
npm install
npm run mocks:init     # one-time: copies the MSW service worker into public/
npm run dev            # http://localhost:5173  (renders entirely from mock data)
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`,
`npm run typecheck`.

The dashboard runs **standalone on MSW mocks** — no backend required. Every widget
reads from a typed API client (`src/api`) whose calls are intercepted by realistic,
seeded tomato data (`src/mocks`). Point it at the real platform with
`VITE_API_BASE` / `VITE_DISABLE_MOCKS` (see `web/.env.example`).

### Screens
- **Crop Report** (default) — Greenhouse Monitoring (Climate Suitability Index spectrum),
  Health Tracking (DLI / light progress + projected yield uplift), the **AI Leaf Panel**
  (chlorophyll index, GLCM texture/severity, Health-Score ring, live `Scan leaf` upload),
  farm aerial overview, and Plant-Section scan counts.
- **Pest & Disease** (fully built) — Late-blight wet-hours risk gauge, Tuta absoluta
  trap-trend + degree-day generation meter, AI leaf-detections feed, active
  recommendations, and per-greenhouse disease-pressure grid.
- **Management** (scaffolded) — live microclimate tiles per greenhouse; scheduling,
  crews, fertigation recipes and M-Pesa billing are stubbed.

### Design system
Tokens are extracted from the reference screenshots and centralised in
`web/tailwind.config.js` + `web/src/index.css`. Primitives live in
`web/src/components/ui/` (GlassCard, SpectrumBar, HealthRing, StatBlock,
SegmentedNav, TimeRangeTabs, DeltaPill, AIInsightsPill, DottedActivityRow,
IconStat, Avatar, Pagination, EmbeddedPhoto).

Agronomy thresholds (temperature/RH/soil-moisture bands, DLI targets, NPK by stage,
disease triggers, Tuta degree-day model) are agronomist-tunable constants in
`web/src/config/tomato.ts`.

---

## 2. AI leaf-scan service (`ai/`)

FastAPI service exposing the model contract the dashboard consumes. Works as a
**mock immediately** (no trained model needed) while computing **real** chlorophyll
greenness + GLCM texture from the uploaded image.

```bash
cd ai
python -m venv .venv && . .venv/Scripts/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`POST /ai/leaf-scan` (multipart `file`) →

```json
{
  "disease": "Tomato_Late_blight", "disease_label": "Late blight",
  "confidence": 0.93, "chl_index": 0.783, "glcm_level": 0.689,
  "health_score": 80, "severity": "high", "is_healthy": false,
  "recommendation": "...", "scanned_at": "2026-06-17T10:32:00Z",
  "model_version": "mock-0.1.0"
}
```

The Vite dev server proxies `/ai` → `http://localhost:8000`, so starting this
service makes the dashboard's `Scan leaf` button hit the real endpoint instead of
the MSW mock. A `# TODO` seam in `ai/predictor.py` loads a real TFLite/ONNX model
when present.

---

## 3. ML training pipeline (`ml/`)

Transfer learning on the **PlantVillage tomato subset** (10 classes) **+ a custom
`Tuta_absoluta_damage` class** (PlantVillage lacks Tuta — field images must be
collected; see `ml/download_data.py`).

```bash
cd ml
python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements.txt
python download_data.py        # prints dataset setup + Kaggle instructions
python train.py --backbone mobilenetv3_large
python export.py               # → leaf_model.tflite + leaf_model.onnx + labels.json
```

MobileNetV3-Large / EfficientNet-B0 backbone, 224×224, softmax + confidence,
two-phase (frozen head → fine-tune), exported for phone/edge inference. Shared
`leaf_metrics.py` computes the chlorophyll index and GLCM severity used to derive
the Health Score (mirrored in `ai/leaf_metrics.py`).

---

## The AI model in one line
A tomato-leaf photo → **disease/health class + confidence**, a **chlorophyll index
("Chl")**, a **GLCM texture/severity level**, and a **Health Score %** — the exact
three numbers shown on the Crop Report centre panel.

See **NOTES.md** for the done-vs-stubbed breakdown.
