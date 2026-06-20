# AngaWatch Greenhouse - `/ai` Leaf Scan Service

A small **FastAPI** service that analyses tomato-leaf photos and returns a
disease classification plus health metrics. It is consumed by the React/Vite
dashboard.

It works **immediately as a mock** - no trained model required - but is
structured so a real TFLite/ONNX model exported from `/ml` can drop in later.
Where possible it computes **real image statistics** from the uploaded photo:

- **Chlorophyll index (`chl_index`)** - greenness / chlorophyll proxy from a
  segmented leaf mask (Excess-Green).
- **GLCM level (`glcm_level`)** - texture / severity proxy from a gray-level
  co-occurrence matrix (contrast + 1 - homogeneity).

The disease **class** is currently mocked deterministically from image stats
(so the same image always gives the same result), while the metrics above
respond to the actual photo.

## Files

| File              | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `main.py`         | FastAPI app: routes, CORS, validation, response model.         |
| `predictor.py`    | `LeafPredictor` - mock classifier + real-model seam.           |
| `leaf_metrics.py` | Pure numpy/scikit-image metrics (chl, GLCM, health score).     |
| `disease_map.py`  | Class list, friendly labels, recommendations, severity hints.  |
| `requirements.txt`| Runtime dependencies (TF/ONNX optional).                       |

## Run locally

```bash
# from the ai/ directory
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

Then open <http://localhost:8000/> for a description, or
<http://localhost:8000/docs> for interactive OpenAPI docs.

You can also run `python main.py` directly (it calls `uvicorn.run(...)` on port
8000).

## Endpoints

- `GET /` - tiny HTML description of the service.
- `GET /health` -> `{"status":"ok","model_version":"mock-0.1.0"}`
- `POST /ai/leaf-scan` - multipart image upload (`file` field) -> analysis JSON.

### Response contract (`POST /ai/leaf-scan`)

The dashboard depends on this exact shape (field names/types):

```json
{
  "disease": "Tomato_Late_blight",
  "disease_label": "Late blight",
  "confidence": 0.93,
  "chl_index": 0.783,
  "glcm_level": 0.689,
  "health_score": 80,
  "severity": "high",
  "is_healthy": false,
  "recommendation": "Apply preventive fungicide tonight and improve ventilation; remove affected leaves.",
  "scanned_at": "2026-06-17T10:32:00Z",
  "model_version": "mock-0.1.0"
}
```

The 11 classes (exact order/labels):

```
Tomato_healthy
Tomato_Bacterial_spot
Tomato_Early_blight
Tomato_Late_blight
Tomato_Leaf_Mold
Tomato_Septoria_leaf_spot
Tomato_Spider_mites_two_spotted
Tomato_Target_Spot
Tomato_Yellow_Leaf_Curl_Virus
Tomato_mosaic_virus
Tuta_absoluta_damage
```

- `severity` is one of: `none | low | moderate | high`.
- `scanned_at` is the request time in UTC ISO-8601 (`...Z`).

## Test with curl (multipart)

```bash
# basic upload
curl -F "file=@/path/to/leaf.jpg" http://localhost:8000/ai/leaf-scan

# pretty-print with jq
curl -s -F "file=@leaf.jpg" http://localhost:8000/ai/leaf-scan | jq

# health check
curl http://localhost:8000/health
```

On Windows PowerShell:

```powershell
curl.exe -F "file=@leaf.jpg" http://localhost:8000/ai/leaf-scan
```

## CORS / the Vite dashboard

CORS is enabled for `http://localhost:5173` (Vite) and `http://localhost:3000`,
with a permissive `*` fallback for development. The frontend posts the image to:

```
POST http://localhost:8000/ai/leaf-scan
```

Example fetch from the dashboard:

```js
const form = new FormData();
form.append("file", fileInput.files[0]);
const res = await fetch("http://localhost:8000/ai/leaf-scan", {
  method: "POST",
  body: form,
});
const analysis = await res.json();
```

> Tighten `allow_origins` (drop the `*`) before deploying to production.

## Dropping in the real model (the seam)

When a model is exported from `/ml`:

1. Place the exported file at `ai/model/leaf_model.tflite` (or set the
   `LEAF_MODEL_PATH` env var to its location).
2. In `predictor.py`, implement `LeafPredictor._load_model` and
   `LeafPredictor._predict_real` (both contain `# TODO: load real TFLite/ONNX
   model here` with example code for TFLite and ONNX).
3. Add `tensorflow` **or** `onnxruntime` to `requirements.txt` (both are listed,
   commented out).

When `MODEL_PATH` exists and loads successfully, the predictor automatically
uses the real path and reports `model_version = "tflite-1.0.0"`; otherwise it
falls back to the deterministic mock (`mock-0.1.0`). The `chl_index` and
`glcm_level` metrics are computed the same way in both modes.

## Self-tests

```bash
python leaf_metrics.py   # synthetic healthy-vs-diseased metric sanity check
python disease_map.py     # verify metadata covers all 11 classes
python predictor.py       # smoke test the full predict() output
```
