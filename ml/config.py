"""Single source of truth for the AngaWatch Greenhouse tomato-leaf model.

All tunables live here as module-level constants. Values that are reasonable to
change per-environment can be overridden with environment variables (see the
``_env_*`` helpers). Import this module everywhere instead of hard-coding paths
or hyper-parameters:

    from config import CLASSES, IMG_SIZE, DATA_DIR

Paths are expressed with forward slashes and resolved relative to this file's
directory (the ``ml/`` folder), so the pipeline behaves the same regardless of
the current working directory.
"""

from __future__ import annotations

import os
from typing import Dict, List, Tuple

# --------------------------------------------------------------------------- #
# Small env-var helpers (keep overrides explicit and typed)
# --------------------------------------------------------------------------- #


def _env_str(name: str, default: str) -> str:
    """Return an environment override as a string, or ``default``."""
    return os.environ.get(name, default)


def _env_int(name: str, default: int) -> int:
    """Return an environment override parsed as int, or ``default``."""
    raw = os.environ.get(name)
    return int(raw) if raw is not None and raw.strip() != "" else default


def _env_float(name: str, default: float) -> float:
    """Return an environment override parsed as float, or ``default``."""
    raw = os.environ.get(name)
    return float(raw) if raw is not None and raw.strip() != "" else default


# --------------------------------------------------------------------------- #
# Class labels (ORDER MATTERS — index == model output channel == labels.json)
# --------------------------------------------------------------------------- #
# This list defines the canonical class order used everywhere: training,
# export, labels.json, and the /ai inference service. Do NOT reorder without
# retraining and re-exporting the model.
CLASSES: List[str] = [
    "Tomato_healthy",
    "Tomato_Bacterial_spot",
    "Tomato_Early_blight",
    "Tomato_Late_blight",
    "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot",
    "Tomato_Spider_mites_two_spotted",
    "Tomato_Target_Spot",
    "Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato_mosaic_virus",
    "Tuta_absoluta_damage",
]

NUM_CLASSES: int = len(CLASSES)  # 11

# Friendly display names for the UI / API responses.
HUMAN_LABELS: Dict[str, str] = {
    "Tomato_healthy": "Healthy",
    "Tomato_Bacterial_spot": "Bacterial spot",
    "Tomato_Early_blight": "Early blight",
    "Tomato_Late_blight": "Late blight",
    "Tomato_Leaf_Mold": "Leaf mold",
    "Tomato_Septoria_leaf_spot": "Septoria leaf spot",
    "Tomato_Spider_mites_two_spotted": "Spider mites (two-spotted)",
    "Tomato_Target_Spot": "Target spot",
    "Tomato_Yellow_Leaf_Curl_Virus": "Yellow leaf curl virus",
    "Tomato_mosaic_virus": "Mosaic virus",
    "Tuta_absoluta_damage": "Tuta absoluta damage",
}

# The single label that means "no disease". Used by leaf_metrics.health_score
# and by the inference service to decide whether to apply a severity penalty.
HEALTHY_LABEL: str = "Tomato_healthy"

# --------------------------------------------------------------------------- #
# Image / training hyper-parameters
# --------------------------------------------------------------------------- #
# Input spatial size fed to the backbone (height, width). 224x224 matches the
# imagenet pre-training resolution for both MobileNetV3-Large and EfficientB0.
IMG_SIZE: Tuple[int, int] = (
    _env_int("IMG_HEIGHT", 224),
    _env_int("IMG_WIDTH", 224),
)

BATCH_SIZE: int = _env_int("BATCH_SIZE", 32)

# Two-phase transfer learning: first train only the new head with the backbone
# frozen, then unfreeze the top of the backbone and fine-tune at a tiny LR.
EPOCHS_HEAD: int = _env_int("EPOCHS_HEAD", 8)
EPOCHS_FINETUNE: int = _env_int("EPOCHS_FINETUNE", 12)
LR_HEAD: float = _env_float("LR_HEAD", 1e-3)
LR_FINETUNE: float = _env_float("LR_FINETUNE", 1e-5)

# Fraction of the dataset held out for validation.
VAL_SPLIT: float = _env_float("VAL_SPLIT", 0.15)

# Global RNG seed for reproducible splits / shuffles / augmentation.
SEED: int = _env_int("SEED", 42)

# Number of backbone layers (counted from the top) to unfreeze for fine-tuning.
FINETUNE_UNFREEZE_LAYERS: int = _env_int("FINETUNE_UNFREEZE_LAYERS", 40)

# --------------------------------------------------------------------------- #
# Backbone selection
# --------------------------------------------------------------------------- #
# Supported values: "mobilenetv3_large" (default, smallest/fastest for edge)
# or "efficientnet_b0" (slightly heavier, often a touch more accurate).
BACKBONE: str = _env_str("BACKBONE", "mobilenetv3_large")
SUPPORTED_BACKBONES: Tuple[str, ...] = ("mobilenetv3_large", "efficientnet_b0")

# --------------------------------------------------------------------------- #
# Filesystem layout (all relative to this ml/ directory)
# --------------------------------------------------------------------------- #
# Absolute path of the directory containing this config.py (i.e. ml/).
BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))

# DATA_DIR layout expected by image_dataset_from_directory:
#   DATA_DIR/<ClassLabel>/<image>.jpg   (one subfolder per entry in CLASSES)
DATA_DIR: str = _env_str("DATA_DIR", os.path.join(BASE_DIR, "data"))

# Where trained Keras checkpoints, reports and labels.json are written.
MODELS_DIR: str = _env_str("MODELS_DIR", os.path.join(BASE_DIR, "models"))

# Where the deployable TFLite / ONNX artifacts are written.
EXPORT_DIR: str = _env_str("EXPORT_DIR", os.path.join(BASE_DIR, "export"))

# Canonical filenames (kept here so train/export/service agree).
LABELS_JSON: str = "labels.json"
KERAS_MODEL_FILE: str = "leaf_model.keras"
TFLITE_MODEL_FILE: str = "leaf_model.tflite"
ONNX_MODEL_FILE: str = "leaf_model.onnx"

# ==========================================================================
# TODO: DATASET GAP — Tuta absoluta
# --------------------------------------------------------------------------
# PlantVillage has NO Tuta absoluta class. The 10 PlantVillage tomato classes
# cover the leaf diseases above, but `Tuta_absoluta_damage` images must be
# FIELD-COLLECTED and placed in:
#
#     DATA_DIR/Tuta_absoluta_damage/<your_images>.jpg
#
# Without this folder the model can only learn 10 classes. See download_data.py
# (prepare_dataset) for the full setup steps and how this gap is reported.
# ==========================================================================


def ensure_dirs() -> None:
    """Create MODELS_DIR and EXPORT_DIR if they don't exist.

    DATA_DIR is intentionally NOT created here — its absence is a meaningful
    signal handled by download_data.prepare_dataset / train.py.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)


if __name__ == "__main__":
    # Quick human-readable dump of the effective configuration.
    print("AngaWatch Greenhouse — effective ML config")
    print("-" * 44)
    print(f"BACKBONE        : {BACKBONE}")
    print(f"NUM_CLASSES     : {NUM_CLASSES}")
    print(f"IMG_SIZE        : {IMG_SIZE}")
    print(f"BATCH_SIZE      : {BATCH_SIZE}")
    print(f"EPOCHS (head)   : {EPOCHS_HEAD}")
    print(f"EPOCHS (ft)     : {EPOCHS_FINETUNE}")
    print(f"LR head / ft    : {LR_HEAD} / {LR_FINETUNE}")
    print(f"VAL_SPLIT       : {VAL_SPLIT}")
    print(f"SEED            : {SEED}")
    print(f"DATA_DIR        : {DATA_DIR}")
    print(f"MODELS_DIR      : {MODELS_DIR}")
    print(f"EXPORT_DIR      : {EXPORT_DIR}")
    print("Classes         :")
    for i, c in enumerate(CLASSES):
        print(f"  [{i:2d}] {c:35s} -> {HUMAN_LABELS[c]}")
