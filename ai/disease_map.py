"""Disease label, recommendation and severity lookup tables.

Self-contained metadata for the 11-class tomato-leaf classifier used by the
AngaWatch Greenhouse mock inference service. Keeping this data in one module
makes it trivial to keep the human-facing copy, severity hints and
recommendations in sync with the model's class list.

All keys are the *raw* class labels exactly as produced by the model, in the
canonical 11-class order defined by :data:`CLASS_NAMES`.
"""

from __future__ import annotations

from typing import Dict, List

# Canonical class list (exact order / labels the model emits).
CLASS_NAMES: List[str] = [
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

# Raw class label -> human-friendly display label.
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

# Raw class label -> concise, tomato-specific action for the grower.
# Recommendations are tuned for a greenhouse production context.
RECOMMENDATIONS: Dict[str, str] = {
    "Tomato_healthy": (
        "No action needed - maintain current conditions, keep monitoring "
        "and scout regularly for early symptoms."
    ),
    "Tomato_Bacterial_spot": (
        "Apply a copper-based spray on a dry day, avoid handling wet foliage, "
        "and remove badly spotted leaves to slow spread."
    ),
    "Tomato_Early_blight": (
        "Remove and destroy lower affected leaves, rotate protectant "
        "fungicides (e.g. chlorothalonil/mancozeb), and improve airflow."
    ),
    "Tomato_Late_blight": (
        "Apply preventive fungicide tonight and improve ventilation; remove "
        "affected leaves. Late blight spreads fast in humid greenhouses."
    ),
    "Tomato_Leaf_Mold": (
        "Lower relative humidity and increase ventilation (greenhouse-specific): "
        "vent, heat or de-humidify, space plants, and avoid leaf wetness."
    ),
    "Tomato_Septoria_leaf_spot": (
        "Avoid overhead watering, remove infected lower leaves, and apply a "
        "labelled fungicide; sanitise tools between plants."
    ),
    "Tomato_Spider_mites_two_spotted": (
        "Increase humidity to suppress mites, rinse undersides of leaves, and "
        "apply a miticide or release predatory mites; treat early."
    ),
    "Tomato_Target_Spot": (
        "Apply a labelled fungicide and tighten sanitation: remove crop debris, "
        "prune for airflow, and reduce canopy wetness."
    ),
    "Tomato_Yellow_Leaf_Curl_Virus": (
        "Control whiteflies (the vector) with traps/insecticide and remove and "
        "destroy infected plants promptly to protect the rest of the crop."
    ),
    "Tomato_mosaic_virus": (
        "Sanitise hands and tools, remove and destroy infected plants, and "
        "control aphids; there is no cure once a plant is infected."
    ),
    "Tuta_absoluta_damage": (
        "Check pheromone traps to confirm pressure, target the spray window for "
        "young larvae, and use Bt or spinosad-based products; remove mined leaves."
    ),
}

# Raw class label -> baseline severity hint when a class is detected.
# One of: "none" | "low" | "moderate" | "high".
# Used as a starting point; predictor.py refines this with image metrics.
SEVERITY_BY_CLASS: Dict[str, str] = {
    "Tomato_healthy": "none",
    "Tomato_Bacterial_spot": "moderate",
    "Tomato_Early_blight": "moderate",
    "Tomato_Late_blight": "high",
    "Tomato_Leaf_Mold": "moderate",
    "Tomato_Septoria_leaf_spot": "moderate",
    "Tomato_Spider_mites_two_spotted": "moderate",
    "Tomato_Target_Spot": "moderate",
    "Tomato_Yellow_Leaf_Curl_Virus": "high",
    "Tomato_mosaic_virus": "high",
    "Tuta_absoluta_damage": "high",
}


def human_label(class_name: str) -> str:
    """Return the friendly label for a raw class, falling back to the raw name."""
    return HUMAN_LABELS.get(class_name, class_name)


def recommendation_for(class_name: str) -> str:
    """Return the recommendation for a raw class, with a safe default."""
    return RECOMMENDATIONS.get(
        class_name,
        "Inspect the plant and consult an agronomist for a tailored treatment.",
    )


def severity_hint(class_name: str) -> str:
    """Return the baseline severity hint for a raw class."""
    return SEVERITY_BY_CLASS.get(class_name, "moderate")


if __name__ == "__main__":  # pragma: no cover - simple consistency self-check
    # Verify every class has metadata in all three tables.
    missing = []
    for name in CLASS_NAMES:
        if name not in HUMAN_LABELS:
            missing.append(f"HUMAN_LABELS missing {name}")
        if name not in RECOMMENDATIONS:
            missing.append(f"RECOMMENDATIONS missing {name}")
        if name not in SEVERITY_BY_CLASS:
            missing.append(f"SEVERITY_BY_CLASS missing {name}")
    if missing:
        raise SystemExit("Metadata gaps:\n  " + "\n  ".join(missing))
    print(f"OK - all {len(CLASS_NAMES)} classes have complete metadata.")
    for name in CLASS_NAMES:
        print(f"  {name:38s} -> {human_label(name):28s} [{severity_hint(name)}]")
