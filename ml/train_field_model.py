"""
Train an accurate, FIELD-ROBUST tomato leaf model — free on Google Colab GPU.

Why this exists
---------------
The default app model is trained on PlantVillage (lab photos: one leaf, plain
background). It scores ~98% on lab images but is unreliable on real phone photos
of plants in the field (the "domain gap"). This script fixes that by training on
BOTH:
  * PlantVillage  (lab, large, clean labels)            -> teaches the diseases
  * PlantDoc      (real field photos, messy backgrounds) -> teaches robustness
plus heavy augmentation, then exports a web-compatible float32 ONNX (standard
Conv ops, so it runs in the browser with onnxruntime-web).

How to run (free GPU, ~20-40 min)
---------------------------------
1. Open https://colab.research.google.com  ->  Runtime  ->  Change runtime type
   ->  GPU (T4 is free).
2. Upload this file (or paste it into a cell) and run the install cell:
       !pip -q install tensorflow tf2onnx onnx kagglehub scikit-learn
3. Get a Kaggle API token (kaggle.com -> Account -> Create New Token) and either
   `!mkdir -p ~/.kaggle && cp kaggle.json ~/.kaggle/` or use kagglehub login.
4. Run:  !python train_field_model.py
5. Download the outputs from the `export/` folder:
       export/tomato_field_model.onnx   export/class_names.json
6. Host the .onnx anywhere public (a new Hugging Face model repo is easiest and
   free) and point the app at it WITHOUT rebuilding:
       in web/.env.local:  VITE_LEAF_MODEL_URL=https://<your-host>/tomato_field_model.onnx
   Copy class_names.json to web/public/models/plant-disease-labels.json.

Notes
-----
* This is leaves only — fruit/stem/root disease datasets are scarce and noisy;
  collect & label your own images to extend it (especially Tuta absoluta, which
  no public dataset covers well).
* Re-run with your OWN field photos added under data/field/<ClassName>/ to keep
  improving accuracy on your specific greenhouse and phone.
"""

from __future__ import annotations
import os
import json
import shutil
import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf

# Canonical tomato classes (must match the app's mapping in web/src/lib/leafModel.ts)
CANON = [
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
]

# Map messy source folder names (PlantVillage + PlantDoc) -> canonical class.
# Lowercased substring match; first hit wins. Tune as datasets change.
ALIASES = [
    ("Tomato_healthy", ["tomato___healthy", "tomato leaf", "tomato_healthy"]),
    ("Tomato_Bacterial_spot", ["bacterial_spot", "bacterial spot"]),
    ("Tomato_Early_blight", ["early_blight", "early blight"]),
    ("Tomato_Late_blight", ["late_blight", "late blight"]),
    ("Tomato_Leaf_Mold", ["leaf_mold", "leaf mold", "mold leaf"]),
    ("Tomato_Septoria_leaf_spot", ["septoria"]),
    ("Tomato_Spider_mites_two_spotted", ["spider_mites", "spider mites", "two-spotted"]),
    ("Tomato_Target_Spot", ["target_spot", "target spot"]),
    ("Tomato_Yellow_Leaf_Curl_Virus", ["yellow_leaf_curl", "yellow leaf curl", "yellowvirus"]),
    ("Tomato_mosaic_virus", ["mosaic"]),
]

IMG_SIZE = 224
BATCH = 32


def canon_for(folder_name: str) -> str | None:
    n = folder_name.lower()
    if "tomato" not in n and "leaf mold" not in n:
        return None
    for canon, keys in ALIASES:
        if any(k in n for k in keys):
            return canon
    return None


def gather(sources: list[Path], out_dir: Path) -> None:
    """Collect tomato images from each source's class folders into out_dir/<canon>/."""
    out_dir.mkdir(parents=True, exist_ok=True)
    count = {c: 0 for c in CANON}
    for src in sources:
        if not src or not src.exists():
            continue
        for sub in src.rglob("*"):
            if not sub.is_dir():
                continue
            canon = canon_for(sub.name)
            if not canon:
                continue
            dst = out_dir / canon
            dst.mkdir(exist_ok=True)
            for img in sub.glob("*"):
                if img.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    target = dst / f"{count[canon]:06d}{img.suffix.lower()}"
                    try:
                        shutil.copy(img, target)
                        count[canon] += 1
                    except Exception:
                        pass
    print("Collected per class:", {k: v for k, v in count.items() if v})


def download_sources() -> list[Path]:
    """Best-effort dataset download via kagglehub. Returns existing source roots."""
    roots: list[Path] = []
    try:
        import kagglehub

        # PlantVillage (lab) — has color/ with Tomato___* folders
        try:
            roots.append(Path(kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")))
        except Exception as e:
            print("PlantVillage download skipped:", e)
        # PlantDoc (field) — classification split
        for slug in ("nirmalsankalana/plantdoc-dataset", "alikhanlimon/plantdoc"):
            try:
                roots.append(Path(kagglehub.dataset_download(slug)))
                break
            except Exception as e:
                print(f"PlantDoc {slug} skipped:", e)
    except ImportError:
        print("kagglehub not installed; run `pip install kagglehub` or place data manually.")
    # also include any local field photos you've added
    local = Path("data/field")
    if local.exists():
        roots.append(local)
    return roots


def build_datasets(data_dir: Path):
    train = tf.keras.utils.image_dataset_from_directory(
        data_dir, validation_split=0.15, subset="training", seed=42,
        image_size=(IMG_SIZE, IMG_SIZE), batch_size=BATCH, label_mode="int",
    )
    val = tf.keras.utils.image_dataset_from_directory(
        data_dir, validation_split=0.15, subset="validation", seed=42,
        image_size=(IMG_SIZE, IMG_SIZE), batch_size=BATCH, label_mode="int",
    )
    class_names = train.class_names
    aug = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.25),
        tf.keras.layers.RandomZoom(0.25),
        tf.keras.layers.RandomTranslation(0.1, 0.1),
        tf.keras.layers.RandomContrast(0.3),
        tf.keras.layers.RandomBrightness(0.2),
    ], name="augment")
    AUTOTUNE = tf.data.AUTOTUNE
    train = train.map(lambda x, y: (aug(x, training=True), y)).prefetch(AUTOTUNE)
    val = val.prefetch(AUTOTUNE)
    return train, val, class_names


def build_model(n: int) -> tf.keras.Model:
    base = tf.keras.applications.EfficientNetB0(include_top=False, weights="imagenet",
                                                input_shape=(IMG_SIZE, IMG_SIZE, 3))
    base.trainable = False
    inp = tf.keras.Input((IMG_SIZE, IMG_SIZE, 3))
    x = tf.keras.applications.efficientnet.preprocess_input(inp)  # baked-in preprocessing
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    out = tf.keras.layers.Dense(n, activation="softmax")(x)
    return tf.keras.Model(inp, out), base


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="data/tomato_merged")
    ap.add_argument("--epochs-head", type=int, default=8)
    ap.add_argument("--epochs-finetune", type=int, default=10)
    ap.add_argument("--skip-download", action="store_true")
    args = ap.parse_args()

    data_dir = Path(args.data_dir)
    if not args.skip_download or not data_dir.exists():
        print("Downloading + merging PlantVillage (lab) + PlantDoc (field)…")
        gather(download_sources(), data_dir)
    if not any(data_dir.glob("*/*")):
        raise SystemExit(f"No images found in {data_dir}. Add data and retry.")

    train, val, class_names = build_datasets(data_dir)
    print("Classes:", class_names)

    # class weights for imbalance
    counts = np.array([len(list((data_dir / c).glob("*"))) for c in class_names], dtype=float)
    weights = {i: float(counts.sum() / (len(counts) * max(1, c))) for i, c in enumerate(counts)}

    model, base = build_model(len(class_names))
    cbs = [
        tf.keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True, monitor="val_accuracy"),
        tf.keras.callbacks.ReduceLROnPlateau(patience=2, factor=0.3),
    ]

    print("Phase 1: train head…")
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                  loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train, validation_data=val, epochs=args.epochs_head, class_weight=weights, callbacks=cbs)

    print("Phase 2: fine-tune backbone…")
    base.trainable = True
    for layer in base.layers[:-40]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),
                  loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train, validation_data=val, epochs=args.epochs_finetune, class_weight=weights, callbacks=cbs)

    # ---- export web-compatible ONNX (float32; standard Conv ops) ----
    out_dir = Path("export")
    out_dir.mkdir(exist_ok=True)
    import tf2onnx

    spec = (tf.TensorSpec((None, IMG_SIZE, IMG_SIZE, 3), tf.float32, name="input"),)
    tf2onnx.convert.from_keras(model, input_signature=spec, opset=17,
                               output_path=str(out_dir / "tomato_field_model.onnx"))
    (out_dir / "class_names.json").write_text(json.dumps(class_names, indent=2))
    print("\n✅ Exported export/tomato_field_model.onnx + export/class_names.json")
    print("NOTE: this model bakes EfficientNet preprocessing in and takes NHWC float[0..255].")
    print("The app currently feeds NCHW normalized input — see README for the matching front-end change.")


if __name__ == "__main__":
    main()
