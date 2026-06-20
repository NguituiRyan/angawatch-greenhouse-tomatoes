"""AngaWatch Greenhouse - /ai mock inference service (FastAPI).

Exposes a tomato-leaf analysis API consumed by the React/Vite dashboard:

* ``GET  /``            - tiny human-facing description of the service.
* ``GET  /health``      - liveness probe + model version.
* ``POST /ai/leaf-scan`` - multipart image upload -> leaf analysis JSON.

The service works immediately as a deterministic mock (see ``predictor.py``);
real chlorophyll + GLCM texture metrics are computed from the uploaded photo.

Run locally:

    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import io
from datetime import datetime, timezone

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from predictor import LeafPredictor

# --------------------------------------------------------------------------- #
# App + CORS
# --------------------------------------------------------------------------- #
app = FastAPI(
    title="AngaWatch Greenhouse - Leaf Scan AI",
    description="Mock tomato-leaf disease & health analysis service.",
    version="0.1.0",
)

# Vite dev server (5173) and CRA-style (3000); "*" is a permissive dev fallback.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A single shared predictor instance (loads the real model once, if present).
predictor = LeafPredictor()


# --------------------------------------------------------------------------- #
# Response model (matches the contract exactly)
# --------------------------------------------------------------------------- #
class LeafScanResponse(BaseModel):
    """Schema for ``POST /ai/leaf-scan`` - the React dashboard depends on this."""

    disease: str = Field(..., description="Raw class label from the 11-class list.")
    disease_label: str = Field(..., description="Human-friendly disease label.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Class confidence 0..1.")
    chl_index: float = Field(..., ge=0.0, le=1.0, description="Chlorophyll index 0..1.")
    glcm_level: float = Field(
        ..., ge=0.0, le=1.0, description="GLCM texture/severity 0..1."
    )
    health_score: int = Field(..., ge=0, le=100, description="Overall health 0..100.")
    severity: str = Field(
        ..., description="One of: none | low | moderate | high."
    )
    is_healthy: bool = Field(..., description="True if classified healthy.")
    recommendation: str = Field(..., description="Concise grower action.")
    scanned_at: str = Field(..., description="UTC ISO-8601 timestamp of the scan.")
    model_version: str = Field(..., description="Inference model version tag.")


class HealthResponse(BaseModel):
    """Schema for ``GET /health``."""

    status: str
    model_version: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _utc_now_iso() -> str:
    """Current UTC time as an ISO-8601 string with a trailing ``Z``."""
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _load_image_to_rgb(raw: bytes) -> np.ndarray:
    """Decode raw image bytes into an ``H x W x 3`` uint8 RGB ndarray.

    Raises :class:`fastapi.HTTPException` (400) on undecodable / non-image data.
    """
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img = img.convert("RGB")
            return np.asarray(img, dtype=np.uint8)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not a readable image: {exc}",
        ) from exc


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@app.get("/", response_class=HTMLResponse)
def root() -> str:
    """Tiny landing page describing the leaf-scan endpoint."""
    return f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>AngaWatch Leaf Scan AI</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:3rem auto;line-height:1.5">
  <h1>AngaWatch Greenhouse - Leaf Scan AI</h1>
  <p>Mock tomato-leaf disease &amp; health analysis service
     (<code>model_version={predictor.model_version}</code>).</p>
  <ul>
    <li><code>GET /health</code> - liveness + model version</li>
    <li><code>POST /ai/leaf-scan</code> - multipart image upload
        (<code>file</code> field) -&gt; analysis JSON</li>
    <li><code>GET /docs</code> - interactive OpenAPI docs</li>
  </ul>
  <p>Example:
     <code>curl -F "file=@leaf.jpg" http://localhost:8000/ai/leaf-scan</code></p>
</body>
</html>"""


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness probe used by the dashboard / orchestrator."""
    return HealthResponse(status="ok", model_version=predictor.model_version)


@app.post("/ai/leaf-scan", response_model=LeafScanResponse)
async def leaf_scan(file: UploadFile = File(...)) -> LeafScanResponse:
    """Analyse an uploaded tomato-leaf photo and return the analysis contract.

    Validates that an image was uploaded, decodes it to RGB, runs the predictor
    (real metrics + mock/real class), and stamps the scan time.
    """
    # Basic content-type validation; some clients omit it, so we also rely on
    # Pillow failing to decode non-images below.
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail=f"Expected an image upload, got content-type "
            f"'{file.content_type}'.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload - no file data.")

    image_rgb = _load_image_to_rgb(raw)

    try:
        result = predictor.predict(image_rgb)
    except Exception as exc:  # defensive: never leak a 500 stacktrace to the UI
        raise HTTPException(
            status_code=422,
            detail=f"Could not analyse the image: {exc}",
        ) from exc

    result["scanned_at"] = _utc_now_iso()
    return LeafScanResponse(**result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
