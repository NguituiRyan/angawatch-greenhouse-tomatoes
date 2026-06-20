# AngaWatch Greenhouse — ML training pipeline (`/ml`)

Transfer-learning pipeline (TensorFlow / Keras) that trains a tomato-leaf
disease classifier on the **PlantVillage tomato subset** plus a custom
field-collected **Tuta absoluta** class, then exports edge-ready **TFLite** and
**ONNX** models. It also ships `leaf_metrics.py`, a dependency-light module of
leaf metrics shared between training analysis and the `/ai` inference service.

## What it does

1. Loads images from `data/<ClassLabel>/*.jpg`.
2. Builds a MobileNetV3-Large (default) or EfficientNet-B0 classifier with an
   imagenet-pretrained backbone.
3. Trains in two phases — frozen head, then fine-tuning the top of the backbone.
4. Handles class imbalance with computed class weights.
5. Saves the best model, `labels.json`, a classification report and a confusion
   matrix.
6. Exports `leaf_model.tflite` (float32 + int8-dynamic) and `leaf_model.onnx`.

## The 11 classes

| # | Label | Friendly name |
|---|-------|---------------|
| 0 | `Tomato_healthy` | Healthy |
| 1 | `Tomato_Bacterial_spot` | Bacterial spot |
| 2 | `Tomato_Early_blight` | Early blight |
| 3 | `Tomato_Late_blight` | Late blight |
| 4 | `Tomato_Leaf_Mold` | Leaf mold |
| 5 | `Tomato_Septoria_leaf_spot` | Septoria leaf spot |
| 6 | `Tomato_Spider_mites_two_spotted` | Spider mites (two-spotted) |
| 7 | `Tomato_Target_Spot` | Target spot |
| 8 | `Tomato_Yellow_Leaf_Curl_Virus` | Yellow leaf curl virus |
| 9 | `Tomato_mosaic_virus` | Mosaic virus |
| 10 | `Tuta_absoluta_damage` | Tuta absoluta damage |

> **TODO — custom class.** PlantVillage provides classes 0–9 only. Class 10,
> `Tuta_absoluta_damage`, is **NOT** in PlantVillage and must be
> **field-collected** and placed in `data/Tuta_absoluta_damage/`. Until you do,
> training runs on whatever classes are present and warns about the gap. See
> `download_data.py`.

> The class order above is canonical (see `config.CLASSES`). The trained model's
> output channels follow the *alphabetical* order Keras infers from the folders;
> the authoritative index→label map is always written to `labels.json` at train
> time and copied next to the exported models.

## Setup

```bash
# 1. Create & activate a virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies (GPU optional — see comments in requirements.txt)
pip install -r requirements.txt

# 3. Download the PlantVillage tomato subset (needs a Kaggle token)
pip install kaggle
kaggle datasets download -d abdallahalidev/plantvillage-dataset -p data --unzip
#   (or: kaggle datasets download -d emmarex/plantdisease -p data --unzip)

# 4. Arrange folders to match config.CLASSES, then check readiness:
python download_data.py
```

`python download_data.py` inspects `data/`, lists per-class image counts, prints
exact folder-rename hints (PlantVillage uses names like `Tomato___Late_blight`)
and reminds you about the Tuta absoluta gap. It never crashes if data is absent.

## Train

```bash
python train.py                                   # defaults from config.py
python train.py --backbone efficientnet_b0        # alternate backbone
python train.py --epochs 20 --data-dir D:/tomato  # overrides
```

Outputs land in `models/`:
- `leaf_model.keras` — best checkpoint (highest val accuracy)
- `labels.json` — class order + friendly names
- `classification_report.txt`
- `confusion_matrix.png`

## Export

```bash
python export.py                                  # uses models/leaf_model.keras
python export.py --model models/leaf_model.keras
```

Outputs land in `export/`:
- `leaf_model.tflite` (float32) and `leaf_model_int8.tflite` (int8 dynamic-range)
- `leaf_model.onnx`
- `labels.json` (copied)

## How this feeds the `/ai` FastAPI service

The exported model is designed for **phone / edge inference** (TFLite on-device,
or ONNX Runtime in a lightweight backend). The `/ai` service loads the exported
model **and imports `leaf_metrics.py` directly** so training and serving compute
identical metrics.

Request flow for `POST /ai/leaf-scan` (multipart leaf image):

1. Decode the image to an RGB numpy array, resize to `config.IMG_SIZE`.
2. Run the TFLite/ONNX model → softmax over the 11 classes; take the top class
   and its confidence.
3. Compute leaf metrics from `leaf_metrics.py`:
   - `chlorophyll_index(rgb)` → `chl_index` (0..1)
   - `glcm_level(rgb)` → `glcm_level` (0..1)
   - `health_score(chl, glcm, confidence, is_healthy)` → `health_score` (0..100)
4. Map the class to a recommendation string.

Example response:

```json
{
  "disease": "Late blight",
  "confidence": 0.94,
  "chl_index": 0.41,
  "glcm_level": 0.62,
  "health_score": 28,
  "recommendation": "Remove affected leaves; apply a copper-based fungicide and improve airflow."
}
```

> Because preprocessing is baked into the model graph (`model.py`), the service
> feeds **raw 0..255 RGB** images to the model — no separate normalization step
> to keep in sync.

## File map

| File | Purpose |
|------|---------|
| `config.py` | Single source of truth (classes, hyper-params, paths). |
| `download_data.py` | Dataset fetch instructions + readiness check. |
| `leaf_metrics.py` | Shared chlorophyll / GLCM / health-score metrics. |
| `model.py` | `build_model` + `unfreeze_top` (MobileNetV3 / EfficientNet). |
| `train.py` | Two-phase training, reports, `labels.json`. |
| `export.py` | TFLite + ONNX export. |
| `requirements.txt` | Pinned dependencies (GPU optional). |
