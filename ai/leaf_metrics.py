"""Pure image-statistics functions for tomato-leaf analysis.

Self-contained (no imports from ``../ml``) numpy / scikit-image helpers that
compute *real* numbers from an uploaded photo:

* :func:`chlorophyll_index` - a greenness / chlorophyll proxy in ``0..1``.
* :func:`glcm_level`        - a GLCM texture / severity proxy in ``0..1``.
* :func:`health_score`      - a documented 0..100 blend of the above plus the
  classifier's confidence and a healthy/diseased flag.

All functions accept an ``H x W x 3`` uint8 (or float) RGB ndarray and are
defensive about empty leaf masks and degenerate images so they never raise on
real-world uploads.

Run ``python leaf_metrics.py`` for a synthetic self-test.
"""

from __future__ import annotations

import numpy as np

try:
    # scikit-image >= 0.19 exposes graycomatrix/graycoprops; older versions
    # used the greycomatrix/greycoprops spelling. Support both.
    from skimage.feature import graycomatrix, graycoprops  # type: ignore
except ImportError:  # pragma: no cover - legacy scikit-image fallback
    from skimage.feature import (  # type: ignore
        greycomatrix as graycomatrix,
        greycoprops as graycoprops,
    )


def _as_rgb_float(rgb: np.ndarray) -> np.ndarray:
    """Coerce an input image to an ``H x W x 3`` float array in ``0..1``.

    Accepts uint8 (``0..255``) or float input, strips an alpha channel if
    present, and broadcasts grayscale to 3 channels.
    """
    arr = np.asarray(rgb)
    if arr.ndim == 2:
        arr = np.stack([arr, arr, arr], axis=-1)
    if arr.ndim != 3:
        raise ValueError(f"Expected an HxWx3 image, got shape {arr.shape!r}")
    if arr.shape[-1] >= 4:
        arr = arr[..., :3]
    elif arr.shape[-1] == 1:
        arr = np.repeat(arr, 3, axis=-1)
    arr = arr.astype(np.float64)
    if arr.max() > 1.0:
        arr = arr / 255.0
    return np.clip(arr, 0.0, 1.0)


def leaf_mask(rgb: np.ndarray) -> np.ndarray:
    """Return a boolean leaf mask using an Excess-Green (ExG) heuristic.

    ExG = ``2G - R - B`` on a per-pixel normalised RGB is a classic vegetation
    index: green-dominant (leaf) pixels score high, soil / pot / background
    score low. We threshold at a small positive value to keep healthy *and*
    chlorotic leaf tissue while dropping clearly non-leaf pixels.
    """
    img = _as_rgb_float(rgb)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    total = r + g + b + 1e-6
    rn, gn, bn = r / total, g / total, b / total
    exg = 2.0 * gn - rn - bn  # Excess Green
    mask = exg > 0.05
    # Fallback: if the ExG mask is (almost) empty - e.g. a very yellow / sick
    # leaf or odd lighting - take any pixel where green is the dominant channel.
    if mask.sum() < 0.02 * mask.size:
        mask = (g >= r) & (g >= b)
    return mask


def chlorophyll_index(rgb: np.ndarray) -> float:
    """Chlorophyll / greenness index in ``0..1`` for a leaf image.

    Steps:
      1. Segment leaf pixels with :func:`leaf_mask` (ExG).
      2. Over leaf pixels, compute normalised greenness ``g / (r + g + b)``,
         which isolates *colour* from brightness.
      3. The theoretical range of that ratio is ``~0.33`` (no green bias) up to
         ``~0.6`` for strongly green tissue; rescale that band to ``0..1``.

    Higher = greener / more chlorophyll = healthier-looking tissue. Guards
    against an empty mask by returning ``0.0``.
    """
    img = _as_rgb_float(rgb)
    mask = leaf_mask(img)
    if not mask.any():
        return 0.0

    r = img[..., 0][mask]
    g = img[..., 1][mask]
    b = img[..., 2][mask]
    total = r + g + b + 1e-6
    greenness = float(np.mean(g / total))  # typically ~0.33 .. ~0.6

    # Rescale the meaningful band [0.33, 0.60] -> [0, 1].
    lo, hi = 0.33, 0.60
    index = (greenness - lo) / (hi - lo)
    return float(np.clip(index, 0.0, 1.0))


def glcm_level(rgb: np.ndarray) -> float:
    """GLCM texture / severity proxy in ``0..1`` for a leaf image.

    Lesions, mottling and mite stippling all raise local texture. We build a
    gray-level co-occurrence matrix on the (masked) grayscale leaf and combine
    two complementary Haralick features:

      * **contrast**     - large for sharp intensity transitions (lesions).
      * **homogeneity**  - large for smooth, uniform tissue; we use
        ``1 - homogeneity`` so it rises with disorder.

    The two are normalised and averaged. Smooth, uniform healthy leaves score
    low; blotchy / lesioned leaves score high. Guards against empty masks and
    degenerate (single-grey-level) crops by returning ``0.0``.
    """
    img = _as_rgb_float(rgb)
    mask = leaf_mask(img)
    if not mask.any():
        return 0.0

    # Luminance grayscale, quantised to 32 levels to keep the GLCM compact.
    gray = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
    levels = 32
    q = np.clip((gray * (levels - 1)).round().astype(np.uint8), 0, levels - 1)

    # Zero-out non-leaf pixels so background does not inject texture.
    q = np.where(mask, q, 0)

    if q.max() == q.min():
        # Flat image -> no texture information.
        return 0.0

    glcm = graycomatrix(
        q,
        distances=[1],
        angles=[0.0, np.pi / 4, np.pi / 2, 3 * np.pi / 4],
        levels=levels,
        symmetric=True,
        normed=True,
    )
    contrast = float(np.mean(graycoprops(glcm, "contrast")))
    homogeneity = float(np.mean(graycoprops(glcm, "homogeneity")))

    # Normalise contrast: max possible contrast for L levels is (L-1)^2; real
    # leaf contrast lives in a small fraction of that, so divide by a softer
    # reference to spread the useful range across 0..1.
    contrast_norm = np.clip(contrast / float((levels - 1) ** 2 * 0.15), 0.0, 1.0)
    disorder = np.clip(1.0 - homogeneity, 0.0, 1.0)

    level = 0.5 * contrast_norm + 0.5 * disorder
    return float(np.clip(level, 0.0, 1.0))


def health_score(
    chl: float,
    glcm: float,
    disease_conf: float,
    is_healthy: bool,
) -> int:
    """Blend metrics into an integer health score ``0..100``.

    Blend (documented weights):

      * ``+45 * chl``                 greener tissue -> healthier.
      * ``-35 * glcm``                more texture/lesions -> less healthy.
      * a disease penalty: if the leaf is classified diseased, subtract up to
        ``30 * disease_conf`` (the more confident the diagnosis, the bigger the
        hit); if healthy, *add* a small confidence bonus of ``10 * conf``.
      * a base of ``55`` so a neutral leaf lands mid-scale.

    The result is clipped to ``[0, 100]`` and rounded to an int.
    """
    chl = float(np.clip(chl, 0.0, 1.0))
    glcm = float(np.clip(glcm, 0.0, 1.0))
    conf = float(np.clip(disease_conf, 0.0, 1.0))

    score = 55.0
    score += 45.0 * chl
    score -= 35.0 * glcm
    if is_healthy:
        score += 10.0 * conf
    else:
        score -= 30.0 * conf

    return int(round(float(np.clip(score, 0.0, 100.0))))


def _synthetic_self_test() -> None:
    """Generate synthetic leaves and sanity-check the metric responses."""
    rng = np.random.default_rng(42)
    h = w = 96

    # Healthy leaf: strong, fairly uniform green.
    healthy = np.zeros((h, w, 3), dtype=np.uint8)
    healthy[..., 1] = 170 + rng.integers(-8, 9, size=(h, w))
    healthy[..., 0] = 60 + rng.integers(-8, 9, size=(h, w))
    healthy[..., 2] = 50 + rng.integers(-8, 9, size=(h, w))

    # Diseased leaf: green base with random brown necrotic blotches (texture).
    diseased = healthy.copy()
    for _ in range(60):
        cy, cx = rng.integers(8, h - 8), rng.integers(8, w - 8)
        diseased[cy - 5 : cy + 5, cx - 5 : cx + 5] = [120, 70, 30]

    # Background / non-leaf image: brownish soil, should yield empty-ish mask.
    soil = np.full((h, w, 3), 0, dtype=np.uint8)
    soil[..., 0] = 130
    soil[..., 1] = 90
    soil[..., 2] = 60

    chl_h = chlorophyll_index(healthy)
    chl_d = chlorophyll_index(diseased)
    glcm_h = glcm_level(healthy)
    glcm_d = glcm_level(diseased)

    print("Synthetic self-test")
    print(f"  healthy : chl={chl_h:.3f} glcm={glcm_h:.3f} "
          f"score={health_score(chl_h, glcm_h, 0.9, True)}")
    print(f"  diseased: chl={chl_d:.3f} glcm={glcm_d:.3f} "
          f"score={health_score(chl_d, glcm_d, 0.9, False)}")
    print(f"  soil    : chl={chlorophyll_index(soil):.3f} "
          f"glcm={glcm_level(soil):.3f}")

    # Assertions: directionally, healthy should look greener and smoother.
    assert 0.0 <= chl_h <= 1.0 and 0.0 <= chl_d <= 1.0
    assert 0.0 <= glcm_h <= 1.0 and 0.0 <= glcm_d <= 1.0
    assert chl_h >= chl_d, "healthy leaf should be at least as green"
    assert glcm_d >= glcm_h, "diseased leaf should be at least as textured"
    assert health_score(chl_h, glcm_h, 0.9, True) > health_score(
        chl_d, glcm_d, 0.9, False
    ), "healthy leaf should score higher"
    print("  OK - all assertions passed.")


if __name__ == "__main__":
    _synthetic_self_test()
