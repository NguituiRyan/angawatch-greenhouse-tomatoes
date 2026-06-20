"""Dataset preparation helper for AngaWatch Greenhouse.

This script does NOT download anything by itself (the training host may be
offline / Kaggle-credential-less). Instead it:

  * documents the Kaggle source datasets,
  * checks DATA_DIR for the expected per-class folders,
  * prints copy-paste setup steps (kaggle CLI), and
  * loudly reminds you that the `Tuta_absoluta_damage` class is NOT in
    PlantVillage and must be field-collected.

Run it any time to see what's present and what's still missing:

    python download_data.py
"""

from __future__ import annotations

import os
from typing import Dict, List, Tuple

from config import CLASSES, DATA_DIR, HEALTHY_LABEL

# --------------------------------------------------------------------------- #
# Source documentation
# --------------------------------------------------------------------------- #
# Two common Kaggle mirrors of PlantVillage. Either works; the second is the
# full, better-maintained dataset (segmented + color + grayscale variants).
KAGGLE_DATASETS: Tuple[str, ...] = (
    "emmarex/plantdisease",                 # smaller "PlantVillage" mirror
    "abdallahalidev/plantvillage-dataset",  # full PlantVillage dataset
)

# The class that PlantVillage does NOT provide and must be collected manually.
CUSTOM_CLASS: str = "Tuta_absoluta_damage"

# PlantVillage folder names usually use this pattern for tomato classes, e.g.
# "Tomato___Late_blight". We map our canonical labels to likely source folder
# names so you know what to rename. (Healthy is "Tomato___healthy".)
PLANTVILLAGE_SOURCE_HINTS: Dict[str, str] = {
    "Tomato_healthy": "Tomato___healthy",
    "Tomato_Bacterial_spot": "Tomato___Bacterial_spot",
    "Tomato_Early_blight": "Tomato___Early_blight",
    "Tomato_Late_blight": "Tomato___Late_blight",
    "Tomato_Leaf_Mold": "Tomato___Leaf_Mold",
    "Tomato_Septoria_leaf_spot": "Tomato___Septoria_leaf_spot",
    "Tomato_Spider_mites_two_spotted": "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato_Target_Spot": "Tomato___Target_Spot",
    "Tomato_Yellow_Leaf_Curl_Virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato_mosaic_virus": "Tomato___Tomato_mosaic_virus",
    # Tuta_absoluta_damage intentionally absent — see TODO below.
}


def _scan_classes() -> Tuple[List[str], List[str], Dict[str, int]]:
    """Return (present, missing, counts) for the expected class folders.

    ``present``  : class labels whose folder exists and holds >=1 image.
    ``missing``  : class labels with no folder or no images.
    ``counts``   : label -> number of image-like files found.
    """
    present: List[str] = []
    missing: List[str] = []
    counts: Dict[str, int] = {}

    image_exts = (".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp")

    for label in CLASSES:
        folder = os.path.join(DATA_DIR, label)
        n = 0
        if os.path.isdir(folder):
            for name in os.listdir(folder):
                if name.lower().endswith(image_exts):
                    n += 1
        counts[label] = n
        if n > 0:
            present.append(label)
        else:
            missing.append(label)

    return present, missing, counts


def _print_setup_instructions() -> None:
    """Print copy-paste setup steps for fetching + arranging the data."""
    print()
    print("=" * 72)
    print("SETUP — how to populate DATA_DIR")
    print("=" * 72)
    print(f"DATA_DIR = {DATA_DIR}")
    print()
    print("Expected layout (one subfolder per class, images inside):")
    print("  DATA_DIR/")
    for label in CLASSES:
        print(f"    {label}/")
    print()
    print("1) Install + authenticate the Kaggle CLI (needs kaggle.json token):")
    print("     pip install kaggle")
    print("     # place kaggle.json in %USERPROFILE%\\.kaggle\\ (Windows)")
    print()
    print("2) Download ONE of the PlantVillage mirrors, e.g.:")
    for ds in KAGGLE_DATASETS:
        print(f"     kaggle datasets download -d {ds} -p \"{DATA_DIR}\" --unzip")
    print()
    print("3) PlantVillage uses folder names like 'Tomato___Late_blight'.")
    print("   Rename/move the tomato folders to match our class labels:")
    for label, src in PLANTVILLAGE_SOURCE_HINTS.items():
        print(f"     '{src}'  ->  '{label}'")
    print()
    print("=" * 72)
    print("!!! TODO — FIELD-COLLECT THE Tuta_absoluta_damage CLASS !!!")
    print("=" * 72)
    print("PlantVillage does NOT contain Tuta absoluta. You MUST collect leaf")
    print("images showing Tuta absoluta mining/damage in the greenhouse and")
    print("place them here:")
    print(f"     {os.path.join(DATA_DIR, CUSTOM_CLASS)}/")
    print("Aim for a count comparable to the other classes (hundreds+) so the")
    print("model can actually learn it. Until then, train.py will train on")
    print("whatever classes are present and warn about the gap.")
    print("=" * 72)


def prepare_dataset() -> Dict[str, object]:
    """Inspect DATA_DIR and report dataset readiness. Never raises on missing data.

    Returns a small status dict (useful for tests / callers):
        {"data_dir_exists": bool, "present": [...], "missing": [...],
         "counts": {...}, "ready": bool}
    """
    print("AngaWatch Greenhouse — dataset preparation check")
    print("-" * 48)

    if not os.path.isdir(DATA_DIR):
        print(f"DATA_DIR does not exist yet: {DATA_DIR}")
        _print_setup_instructions()
        return {
            "data_dir_exists": False,
            "present": [],
            "missing": list(CLASSES),
            "counts": {c: 0 for c in CLASSES},
            "ready": False,
        }

    present, missing, counts = _scan_classes()

    print(f"DATA_DIR: {DATA_DIR}")
    print("Per-class image counts:")
    for label in CLASSES:
        flag = "ok " if counts[label] > 0 else "MISSING"
        print(f"  [{flag}] {label:35s} {counts[label]:>6d} images")

    total = sum(counts.values())
    print(f"Total images found: {total}")

    if CUSTOM_CLASS in missing:
        print()
        print(f"NOTE: custom class '{CUSTOM_CLASS}' has no images — this is the")
        print("      known PlantVillage gap and must be field-collected.")

    # "ready" = at least the healthy class + one disease class are usable.
    ready = (HEALTHY_LABEL in present) and (len(present) >= 2)

    if missing:
        _print_setup_instructions()
    else:
        print("\nAll expected class folders are populated. Ready to train.")

    return {
        "data_dir_exists": True,
        "present": present,
        "missing": missing,
        "counts": counts,
        "ready": ready,
    }


if __name__ == "__main__":
    prepare_dataset()
