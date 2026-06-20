"""Leaf disease predictor for the AngaWatch Greenhouse mock service.

:class:`LeafPredictor` produces the full response contract from an RGB ndarray.
By default it runs a **deterministic mock**: real image statistics (chlorophyll
index + GLCM texture) are computed from the photo, while the disease *class* is
chosen heuristically from those stats plus a stable per-image hash so results
are reproducible (the same image always yields the same class).

A clearly-marked seam (:data:`MODEL_PATH` / :meth:`LeafPredictor._predict_real`)
shows exactly where a trained TFLite / ONNX model exported from ``/ml`` drops
in. When a model file is present at ``MODEL_PATH`` the real path is used; the
mock remains the default so the service works immediately.
"""

from __future__ import annotations

import hashlib
import os
from typing import Dict, List

import numpy as np

from disease_map import (
    CLASS_NAMES,
    human_label,
    recommendation_for,
    severity_hint,
)
from leaf_metrics import chlorophyll_index, glcm_level, health_score

MODEL_VERSION_MOCK = "mock-0.1.0"
MODEL_VERSION_REAL = "tflite-1.0.0"

# Path to an optional real model exported from /ml. If this file exists the
# predictor uses the real inference path; otherwise it falls back to the mock.
# Override with the LEAF_MODEL_PATH env var.
MODEL_PATH = os.environ.get(
    "LEAF_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "model", "leaf_model.tflite"),
)

# Severity ordering, low -> high, for clamping / comparison.
_SEVERITY_ORDER: List[str] = ["none", "low", "moderate", "high"]


def _severity_from_metrics(class_name: str, glcm: float, chl: float) -> str:
    """Refine the class baseline severity using real image metrics.

    Starts from the per-class hint, then nudges up when texture is high and
    greenness is low (a sicker-looking leaf), and down when the leaf still
    looks green and smooth.
    """
    if class_name == "Tomato_healthy":
        return "none"

    base = severity_hint(class_name)
    idx = _SEVERITY_ORDER.index(base)

    # Visible damage signal in 0..1: lots of texture, little green.
    damage = float(np.clip(0.6 * glcm + 0.4 * (1.0 - chl), 0.0, 1.0))
    if damage > 0.66:
        idx += 1
    elif damage < 0.33:
        idx -= 1

    idx = int(np.clip(idx, 1, len(_SEVERITY_ORDER) - 1))  # never "none" if diseased
    return _SEVERITY_ORDER[idx]


def _stable_image_hash(image_rgb: np.ndarray) -> int:
    """Return a stable integer hash derived from the image's pixel statistics.

    Uses coarse per-channel means/std so visually-similar images map to the
    same class, while different images vary - and crucially the result is
    *deterministic* (no unseeded randomness), so a given image always produces
    the same diagnosis.
    """
    img = np.asarray(image_rgb, dtype=np.float64)
    if img.ndim == 2:
        img = np.stack([img, img, img], axis=-1)
    img = img[..., :3]
    # Quantise channel means/std to stabilise against tiny pixel differences.
    feats = []
    for c in range(3):
        ch = img[..., c]
        feats.append(int(round(float(ch.mean()))))
        feats.append(int(round(float(ch.std()))))
    digest = hashlib.sha256(",".join(map(str, feats)).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


class LeafPredictor:
    """Predicts tomato-leaf disease + health metrics from an RGB image.

    Parameters
    ----------
    model_path:
        Optional override for :data:`MODEL_PATH`. If the file exists, the real
        inference path is used; otherwise the deterministic mock runs.
    """

    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = model_path or MODEL_PATH
        self._model = None  # lazily-loaded real model handle
        self.use_real_model = os.path.isfile(self.model_path)
        self.model_version = (
            MODEL_VERSION_REAL if self.use_real_model else MODEL_VERSION_MOCK
        )
        if self.use_real_model:
            self._load_model()

    # ------------------------------------------------------------------ #
    # Real-model seam
    # ------------------------------------------------------------------ #
    def _load_model(self) -> None:
        """Load the real TFLite / ONNX model. Stub for the future seam.

        TODO: load real TFLite/ONNX model here. Example (TFLite):

            import tensorflow as tf
            self._model = tf.lite.Interpreter(model_path=self.model_path)
            self._model.allocate_tensors()

        or for ONNX:

            import onnxruntime as ort
            self._model = ort.InferenceSession(self.model_path)
        """
        # Intentionally a no-op stub until a real model is wired up. We fall
        # back to the mock so the service never hard-fails on a missing runtime.
        self._model = None
        self.use_real_model = False
        self.model_version = MODEL_VERSION_MOCK

    def _predict_real(self, image_rgb: np.ndarray) -> tuple[str, float]:
        """Run the real model and return ``(class_name, confidence)``.

        TODO: load real TFLite/ONNX model here and implement preprocessing +
        inference. Expected flow:

            1. Resize/normalise ``image_rgb`` to the model's input spec.
            2. Run inference -> a length-11 probability vector aligned with
               :data:`CLASS_NAMES`.
            3. argmax -> class, max -> confidence.

        Until implemented, defer to the mock so behaviour is well defined.
        """
        return self._predict_mock_class(image_rgb)

    # ------------------------------------------------------------------ #
    # Mock classifier
    # ------------------------------------------------------------------ #
    def _predict_mock_class(self, image_rgb: np.ndarray) -> tuple[str, float]:
        """Deterministically choose a class + confidence from image stats.

        Heuristic:
          * Very green + low texture  -> healthy (high confidence).
          * High texture / low green  -> a disease class, picked stably from a
            per-image hash so different photos give different (but repeatable)
            diagnoses.
        """
        chl = chlorophyll_index(image_rgb)
        glcm = glcm_level(image_rgb)

        # Healthy gate: green and smooth.
        if chl >= 0.55 and glcm <= 0.30:
            confidence = float(np.clip(0.80 + 0.18 * chl - 0.20 * glcm, 0.6, 0.99))
            return "Tomato_healthy", round(confidence, 3)

        # Otherwise pick a disease class deterministically from the image hash.
        disease_classes = [c for c in CLASS_NAMES if c != "Tomato_healthy"]
        h = _stable_image_hash(image_rgb)
        class_name = disease_classes[h % len(disease_classes)]

        # Confidence grows with how "unhealthy" the leaf looks (more texture,
        # less green), with a small stable jitter from the hash for realism.
        damage = float(np.clip(0.6 * glcm + 0.4 * (1.0 - chl), 0.0, 1.0))
        jitter = ((h >> 8) % 100) / 1000.0  # 0.000 .. 0.099, stable per image
        confidence = float(np.clip(0.62 + 0.30 * damage + jitter, 0.5, 0.99))
        return class_name, round(confidence, 3)

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def predict(self, image_rgb: np.ndarray) -> Dict[str, object]:
        """Analyse an ``H x W x 3`` RGB image and return the full contract.

        ``scanned_at`` is intentionally left to the caller (the API layer sets
        it to the request time) and is *not* included here.
        """
        image_rgb = np.asarray(image_rgb)

        # Real image statistics (always computed, mock or real model).
        chl = round(chlorophyll_index(image_rgb), 3)
        glcm = round(glcm_level(image_rgb), 3)

        # Disease class + confidence: real model if available, else mock.
        if self.use_real_model and self._model is not None:
            disease, confidence = self._predict_real(image_rgb)
        else:
            disease, confidence = self._predict_mock_class(image_rgb)

        is_healthy = disease == "Tomato_healthy"
        severity = _severity_from_metrics(disease, glcm, chl)
        score = health_score(chl, glcm, confidence, is_healthy)

        return {
            "disease": disease,
            "disease_label": human_label(disease),
            "confidence": round(float(confidence), 3),
            "chl_index": float(chl),
            "glcm_level": float(glcm),
            "health_score": int(score),
            "severity": severity,
            "is_healthy": bool(is_healthy),
            "recommendation": recommendation_for(disease),
            "model_version": self.model_version,
        }


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    rng = np.random.default_rng(7)
    # A green-ish synthetic leaf.
    leaf = np.zeros((96, 96, 3), dtype=np.uint8)
    leaf[..., 1] = 160 + rng.integers(-10, 11, size=(96, 96))
    leaf[..., 0] = 70
    leaf[..., 2] = 55
    pred = LeafPredictor()
    out = pred.predict(leaf)
    print(f"model_version={pred.model_version} use_real_model={pred.use_real_model}")
    for k, v in out.items():
        print(f"  {k:16s}: {v}")
