"""Two-phase transfer-learning trainer for AngaWatch Greenhouse.

Pipeline
--------
1. Build train/val tf.data pipelines from DATA_DIR via
   image_dataset_from_directory (deterministic split + seed).
2. On-graph data augmentation (flip / rotation / zoom / contrast).
3. Compute class weights to counter class imbalance.
4. Phase 1 — train the new head with the backbone frozen.
5. Phase 2 — unfreeze the top of the backbone and fine-tune at a tiny LR.
6. Callbacks: ModelCheckpoint (best val), EarlyStopping, ReduceLROnPlateau.
7. Save best model, labels.json, classification_report.txt and a
   confusion_matrix.png into MODELS_DIR.

Usage
-----
    python train.py
    python train.py --backbone efficientnet_b0 --epochs 20
    python train.py --data-dir /path/to/data

If DATA_DIR is missing, the script prints the setup instructions from
download_data and exits gracefully (no traceback).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Dict, List, Tuple

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers

import config
from model import build_model, unfreeze_top


# --------------------------------------------------------------------------- #
# Data
# --------------------------------------------------------------------------- #
def _build_augmentation() -> tf.keras.Sequential:
    """On-graph augmentation layer (active only during training)."""
    return tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal_and_vertical", seed=config.SEED),
            layers.RandomRotation(0.15, seed=config.SEED),
            layers.RandomZoom(0.15, seed=config.SEED),
            layers.RandomContrast(0.15, seed=config.SEED),
        ],
        name="augmentation",
    )


def _make_datasets(
    data_dir: str,
) -> Tuple[tf.data.Dataset, tf.data.Dataset, List[str]]:
    """Create (train_ds, val_ds, class_names) from a directory of class folders.

    Uses a fixed seed + validation_split so the same images land in the same
    split every run. ``class_names`` is the order Keras inferred (alphabetical),
    which we reconcile with config.CLASSES when writing labels.json.
    """
    common = dict(
        labels="inferred",
        label_mode="int",
        image_size=config.IMG_SIZE,
        batch_size=config.BATCH_SIZE,
        seed=config.SEED,
        validation_split=config.VAL_SPLIT,
    )

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir, subset="training", shuffle=True, **common
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir, subset="validation", shuffle=False, **common
    )

    class_names = list(train_ds.class_names)

    # Performance: cache + prefetch. Augmentation is applied to the train set.
    augment = _build_augmentation()
    autotune = tf.data.AUTOTUNE

    train_ds = (
        train_ds.map(lambda x, y: (augment(x, training=True), y),
                     num_parallel_calls=autotune)
        .prefetch(autotune)
    )
    val_ds = val_ds.prefetch(autotune)

    return train_ds, val_ds, class_names


def _compute_class_weights(
    data_dir: str, class_names: List[str]
) -> Dict[int, float]:
    """Inverse-frequency class weights keyed by the Keras label index.

    Counts image files per class folder (cheap, avoids iterating the dataset),
    then computes balanced weights: w_c = total / (n_classes * count_c).
    """
    image_exts = (".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp")
    counts: List[int] = []
    for name in class_names:
        folder = os.path.join(data_dir, name)
        n = 0
        if os.path.isdir(folder):
            n = sum(
                1 for f in os.listdir(folder) if f.lower().endswith(image_exts)
            )
        counts.append(max(n, 1))  # avoid division by zero

    total = float(sum(counts))
    n_classes = len(counts)
    weights = {
        idx: total / (n_classes * cnt) for idx, cnt in enumerate(counts)
    }
    return weights


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
def _write_labels_json(class_names: List[str], out_dir: str) -> None:
    """Persist the index->label map the exported model and service rely on.

    ``class_names`` is the Keras (alphabetical) order, which is what the trained
    model's output channels correspond to. We also attach the friendly names.
    """
    from config import HUMAN_LABELS

    payload = {
        "classes": class_names,
        "human_labels": {c: HUMAN_LABELS.get(c, c) for c in class_names},
        "num_classes": len(class_names),
    }
    path = os.path.join(out_dir, config.LABELS_JSON)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
    print(f"Wrote labels -> {path}")


def _write_reports(
    model: tf.keras.Model,
    val_ds: tf.data.Dataset,
    class_names: List[str],
    out_dir: str,
) -> None:
    """Write a sklearn classification_report and a confusion-matrix PNG."""
    try:
        from sklearn.metrics import classification_report, confusion_matrix
    except Exception as exc:  # pragma: no cover
        print(f"scikit-learn unavailable, skipping reports: {exc}")
        return

    y_true: List[int] = []
    y_pred: List[int] = []
    for batch_x, batch_y in val_ds:
        probs = model.predict(batch_x, verbose=0)
        y_pred.extend(np.argmax(probs, axis=1).tolist())
        y_true.extend(batch_y.numpy().tolist())

    if not y_true:
        print("Validation set empty — no reports written.")
        return

    report = classification_report(
        y_true, y_pred, target_names=class_names, zero_division=0
    )
    report_path = os.path.join(out_dir, "classification_report.txt")
    with open(report_path, "w", encoding="utf-8") as fh:
        fh.write(report)
    print(f"Wrote report -> {report_path}")
    print(report)

    # Confusion matrix figure.
    try:
        import matplotlib

        matplotlib.use("Agg")  # headless backend
        import matplotlib.pyplot as plt

        cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
        fig, ax = plt.subplots(figsize=(10, 9))
        im = ax.imshow(cm, cmap="Blues")
        ax.set_title("Confusion matrix (validation)")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_xticks(range(len(class_names)))
        ax.set_yticks(range(len(class_names)))
        ax.set_xticklabels(class_names, rotation=90, fontsize=7)
        ax.set_yticklabels(class_names, fontsize=7)
        fig.colorbar(im, ax=ax)
        # Annotate counts.
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                ax.text(
                    j, i, str(cm[i, j]),
                    ha="center", va="center", fontsize=6,
                    color="white" if cm[i, j] > cm.max() / 2 else "black",
                )
        fig.tight_layout()
        cm_path = os.path.join(out_dir, "confusion_matrix.png")
        fig.savefig(cm_path, dpi=150)
        plt.close(fig)
        print(f"Wrote confusion matrix -> {cm_path}")
    except Exception as exc:  # pragma: no cover
        print(f"Could not render confusion matrix: {exc}")


# --------------------------------------------------------------------------- #
# Training phases
# --------------------------------------------------------------------------- #
def _callbacks(monitor: str = "val_accuracy") -> List[tf.keras.callbacks.Callback]:
    """Standard callback set, checkpointing the best Keras model."""
    ckpt_path = os.path.join(config.MODELS_DIR, config.KERAS_MODEL_FILE)
    return [
        tf.keras.callbacks.ModelCheckpoint(
            ckpt_path, monitor=monitor, mode="max",
            save_best_only=True, verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor=monitor, mode="max", patience=5,
            restore_best_weights=True, verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3,
            min_lr=1e-7, verbose=1,
        ),
    ]


def train(
    backbone: str,
    data_dir: str,
    epochs_head: int,
    epochs_finetune: int,
) -> None:
    """Run the full two-phase training pipeline."""
    config.ensure_dirs()
    tf.random.set_seed(config.SEED)
    np.random.seed(config.SEED)

    train_ds, val_ds, class_names = _make_datasets(data_dir)
    print(f"Discovered {len(class_names)} classes: {class_names}")

    # Warn about any expected-but-absent classes (notably Tuta absoluta).
    missing = [c for c in config.CLASSES if c not in class_names]
    if missing:
        print(f"WARNING: expected classes not found in data: {missing}")
        if "Tuta_absoluta_damage" in missing:
            print("         -> Tuta_absoluta_damage must be field-collected "
                  "(see download_data.py).")

    class_weights = _compute_class_weights(data_dir, class_names)
    print(f"Class weights: {class_weights}")

    model = build_model(len(class_names), backbone)

    # ----- Phase 1: frozen backbone, train head -----
    print("\n=== Phase 1: training head (backbone frozen) ===")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(config.LR_HEAD),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_head,
        class_weight=class_weights,
        callbacks=_callbacks(),
    )

    # ----- Phase 2: unfreeze top, fine-tune -----
    print("\n=== Phase 2: fine-tuning top of backbone ===")
    unfreeze_top(model, config.FINETUNE_UNFREEZE_LAYERS)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(config.LR_FINETUNE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_finetune,
        class_weight=class_weights,
        callbacks=_callbacks(),
    )

    # ----- Persist artifacts -----
    # ModelCheckpoint already saved the best model; ensure it exists, else save.
    ckpt_path = os.path.join(config.MODELS_DIR, config.KERAS_MODEL_FILE)
    if not os.path.exists(ckpt_path):
        model.save(ckpt_path)
        print(f"Saved model -> {ckpt_path}")

    _write_labels_json(class_names, config.MODELS_DIR)
    _write_reports(model, val_ds, class_names, config.MODELS_DIR)
    print("\nTraining complete. Next: python export.py")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _parse_args(argv: List[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train the AngaWatch tomato-leaf model.")
    p.add_argument(
        "--backbone", default=config.BACKBONE, choices=list(config.SUPPORTED_BACKBONES),
        help="Backbone architecture.",
    )
    p.add_argument(
        "--epochs", type=int, default=None,
        help="Override BOTH phases' epoch counts with this value.",
    )
    p.add_argument(
        "--data-dir", default=config.DATA_DIR,
        help="Directory of per-class image folders.",
    )
    return p.parse_args(argv)


def main(argv: List[str]) -> int:
    args = _parse_args(argv)

    # Graceful guard: no data -> print setup help and exit cleanly.
    if not os.path.isdir(args.data_dir):
        print(f"DATA_DIR not found: {args.data_dir}\n")
        try:
            from download_data import prepare_dataset

            prepare_dataset()
        except Exception as exc:  # pragma: no cover
            print(f"(could not run dataset check: {exc})")
        return 1

    epochs_head = args.epochs if args.epochs is not None else config.EPOCHS_HEAD
    epochs_finetune = (
        args.epochs if args.epochs is not None else config.EPOCHS_FINETUNE
    )

    train(
        backbone=args.backbone,
        data_dir=args.data_dir,
        epochs_head=epochs_head,
        epochs_finetune=epochs_finetune,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
