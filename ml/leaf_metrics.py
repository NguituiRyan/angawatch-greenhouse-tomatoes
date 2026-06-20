"""Shared leaf-metric computation for AngaWatch Greenhouse.

These functions are deliberately dependency-light (numpy + scikit-image only)
so the SAME module can be imported by:

  * training-time analysis (sanity-checking metrics per class), and
  * the /ai FastAPI inference service (per-request leaf scoring).

All inputs are plain ``numpy`` RGB arrays of shape (H, W, 3). Either uint8
(0..255) or float (0..1 or 0..255) is accepted — values are normalised
internally. Functions are robust to tiny / empty leaf masks.

Metrics produced
----------------
* chlorophyll_index ("Chl")  -> float in 0..1, higher = greener / healthier.
* glcm_level       ("GLCM Level") -> float in 0..1, higher = more texture /
                                     lesion severity.
* health_score                -> int   in 0..100, overall leaf health.
"""

from __future__ import annotations

from typing import Tuple

import numpy as np

# scikit-image is only needed for the GLCM texture metric. Import lazily-safe:
# if the user only wants chlorophyll_index, we still want this module to import.
try:
    from skimage.color import rgb2gray
    from skimage.feature import graycomatrix, graycoprops

    _SKIMAGE_AVAILABLE = True
except Exception:  # pragma: no cover - exercised only when skimage is missing
    _SKIMAGE_AVAILABLE = False


_EPS = 1e-6


# --------------------------------------------------------------------------- #
# Internal helpers
# --------------------------------------------------------------------------- #
def _to_float_rgb(rgb_array: np.ndarray) -> np.ndarray:
    """Coerce input to a float32 RGB array scaled to 0..1.

    Accepts uint8 (0..255) or float arrays in either 0..1 or 0..255. Anything
    larger than ~1.5 is assumed to be on a 0..255 scale.
    """
    arr = np.asarray(rgb_array, dtype=np.float32)
    if arr.ndim != 3 or arr.shape[2] < 3:
        raise ValueError(
            f"Expected an (H, W, 3) RGB array, got shape {arr.shape!r}"
        )
    arr = arr[:, :, :3]  # drop alpha if present
    if arr.max() > 1.5:
        arr = arr / 255.0
    return np.clip(arr, 0.0, 1.0)


def _leaf_mask(rgb01: np.ndarray) -> np.ndarray:
    """Segment leaf pixels from background using an Excess-Green (ExG) rule.

    ExG = 2G - R - B is a classic, illumination-tolerant greenness index.
    We keep pixels that are both green-dominant (ExG > 0) and not too dark,
    which removes most neutral / shadow / soil backgrounds. Returns a 2-D bool
    mask the size of the image.
    """
    r, g, b = rgb01[:, :, 0], rgb01[:, :, 1], rgb01[:, :, 2]
    exg = 2.0 * g - r - b
    brightness = (r + g + b) / 3.0
    # Green-dominant AND reasonably lit. Thresholds are intentionally lenient
    # so diseased (yellow/brown) leaf tissue still mostly survives the mask.
    mask = (exg > 0.0) & (brightness > 0.10)
    return mask


# --------------------------------------------------------------------------- #
# Public metrics
# --------------------------------------------------------------------------- #
def chlorophyll_index(rgb_array: np.ndarray) -> float:
    """Proxy chlorophyll index ("Chl") in 0..1 (higher = greener/healthier).

    Method
    ------
    1. Segment the leaf from the background with an Excess-Green mask.
    2. Over leaf pixels only, compute normalized greenness g = (G - R)/(G + R).
       This is a cheap, white-balance-tolerant stand-in for chlorophyll
       content (true chlorophyll needs spectral / NDVI data we don't have on a
       phone camera).
    3. g lies in roughly -1..1; rescale to 0..1 via (g + 1) / 2 and average.

    Robustness: if the leaf mask is too small (<0.5% of pixels) we fall back to
    the whole image so the function never divides by ~zero.
    """
    rgb01 = _to_float_rgb(rgb_array)
    mask = _leaf_mask(rgb01)

    total_px = mask.size
    if mask.sum() < max(16, int(0.005 * total_px)):
        # Mask too small to trust — use the entire frame instead.
        mask = np.ones(rgb01.shape[:2], dtype=bool)

    r = rgb01[:, :, 0][mask]
    g = rgb01[:, :, 1][mask]
    norm_green = (g - r) / (g + r + _EPS)  # in ~[-1, 1]
    chl = float(np.mean((norm_green + 1.0) / 2.0))  # -> [0, 1]
    return float(np.clip(chl, 0.0, 1.0))


def glcm_level(rgb_array: np.ndarray) -> float:
    """Texture / lesion-severity proxy ("GLCM Level") in 0..1.

    A healthy leaf surface is smooth (low contrast, high homogeneity). Lesions,
    necrosis and mosaic patterns add high-frequency texture. We summarise this
    with a Gray-Level Co-occurrence Matrix:

        level = 0.5 * norm_contrast + 0.5 * (1 - homogeneity)

    where ``norm_contrast`` is the GLCM contrast squashed into 0..1 with a
    saturating transform and ``homogeneity`` is already in 0..1 (1 == perfectly
    smooth). Higher ``level`` => rougher / more diseased-looking texture.

    Requires scikit-image. If it is unavailable, returns 0.0 (a neutral value)
    rather than raising, so the service degrades gracefully.
    """
    if not _SKIMAGE_AVAILABLE:
        return 0.0

    rgb01 = _to_float_rgb(rgb_array)
    if rgb01.shape[0] < 2 or rgb01.shape[1] < 2:
        return 0.0  # too small to have neighbouring pixels

    # Grayscale, quantised to 32 levels to keep the GLCM compact and stable.
    gray = rgb2gray(rgb01)  # 0..1 float
    levels = 32
    q = np.clip((gray * (levels - 1)).round().astype(np.uint8), 0, levels - 1)

    # Co-occurrence over a few short distances/angles, averaged for rotation
    # invariance. symmetric+normed keeps props comparable across images.
    glcm = graycomatrix(
        q,
        distances=[1, 2],
        angles=[0.0, np.pi / 4, np.pi / 2, 3 * np.pi / 4],
        levels=levels,
        symmetric=True,
        normed=True,
    )

    contrast = float(np.mean(graycoprops(glcm, "contrast")))
    homogeneity = float(np.mean(graycoprops(glcm, "homogeneity")))  # 0..1

    # Squash unbounded contrast into 0..1. With 32 levels, contrast values of a
    # few hundred are common for very textured leaves; the constant below maps
    # "moderately textured" to ~0.5.
    norm_contrast = contrast / (contrast + 50.0)

    level = 0.5 * norm_contrast + 0.5 * (1.0 - homogeneity)
    return float(np.clip(level, 0.0, 1.0))


def health_score(
    chl: float,
    glcm: float,
    disease_conf: float,
    is_healthy: bool,
) -> int:
    """Blend metrics into an overall leaf health score in 0..100.

    Inputs
    ------
    chl          : chlorophyll_index() output (0..1, higher = healthier).
    glcm         : glcm_level() output       (0..1, higher = more severe).
    disease_conf : classifier confidence for the predicted class (0..1).
    is_healthy   : True if the predicted class is the healthy class.

    Formula
    -------
    Base health rewards greenness and penalises texture/severity:

        base = 0.55 * chl + 0.45 * (1 - glcm)        # in 0..1

    When the model is confident the leaf is NOT healthy, scale the base down by
    a disease penalty proportional to that confidence (a confident disease call
    should not be allowed to score "healthy"):

        if not is_healthy:
            base *= (1 - 0.7 * disease_conf)

    Finally map to an integer 0..100.
    """
    chl = float(np.clip(chl, 0.0, 1.0))
    glcm = float(np.clip(glcm, 0.0, 1.0))
    disease_conf = float(np.clip(disease_conf, 0.0, 1.0))

    base = 0.55 * chl + 0.45 * (1.0 - glcm)

    if not is_healthy:
        # Up to a 70% reduction at full confidence in a disease.
        base *= 1.0 - 0.7 * disease_conf

    score = int(round(np.clip(base, 0.0, 1.0) * 100.0))
    return score


# --------------------------------------------------------------------------- #
# Self-test on synthetic arrays
# --------------------------------------------------------------------------- #
def _synthetic_leaf(green: float, noise: float, size: Tuple[int, int] = (96, 96)) -> np.ndarray:
    """Build a synthetic RGB leaf: a green patch with optional speckle noise."""
    h, w = size
    img = np.zeros((h, w, 3), dtype=np.float32)
    img[:, :, 1] = green          # green channel
    img[:, :, 0] = 0.2            # a little red
    img[:, :, 2] = 0.1            # a little blue
    if noise > 0:
        rng = np.random.default_rng(0)
        img += rng.normal(0.0, noise, img.shape).astype(np.float32)
    return np.clip(img, 0.0, 1.0)


if __name__ == "__main__":
    print("leaf_metrics self-test")
    print("-" * 30)
    print(f"scikit-image available: {_SKIMAGE_AVAILABLE}")

    healthy = _synthetic_leaf(green=0.8, noise=0.0)
    diseased = _synthetic_leaf(green=0.35, noise=0.25)

    h_chl = chlorophyll_index(healthy)
    h_glcm = glcm_level(healthy)
    d_chl = chlorophyll_index(diseased)
    d_glcm = glcm_level(diseased)

    print(f"healthy  : chl={h_chl:.3f}  glcm={h_glcm:.3f}  "
          f"score={health_score(h_chl, h_glcm, 0.05, True)}")
    print(f"diseased : chl={d_chl:.3f}  glcm={d_glcm:.3f}  "
          f"score={health_score(d_chl, d_glcm, 0.92, False)}")

    # Edge cases: empty-ish / tiny arrays must not crash.
    tiny = np.zeros((1, 1, 3), dtype=np.uint8)
    print(f"tiny     : chl={chlorophyll_index(tiny):.3f}  glcm={glcm_level(tiny):.3f}")
    print("OK")
