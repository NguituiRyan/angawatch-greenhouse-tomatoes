"""Export the trained Keras model to edge formats for AngaWatch Greenhouse.

Produces, into EXPORT_DIR:
  * leaf_model.tflite   — TFLite (float32) + an int8-dynamic-range variant
                          (leaf_model_int8.tflite) for smaller/faster phones.
  * leaf_model.onnx     — ONNX (opset 13) via tf2onnx, for ONNX Runtime / web.
  * labels.json         — copied next to the models so the service self-describes.

Usage
-----
    python export.py
    python export.py --model models/leaf_model.keras

If the trained model is absent, the script explains how to train it and exits
gracefully (no traceback).
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from typing import List

import tensorflow as tf

import config


# --------------------------------------------------------------------------- #
# TFLite
# --------------------------------------------------------------------------- #
def export_tflite(model: tf.keras.Model, export_dir: str) -> None:
    """Write a float32 TFLite model and an int8-dynamic-range variant."""
    # Float32 (default) — most compatible.
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = []  # no quantization
    fp32 = converter.convert()
    fp32_path = os.path.join(export_dir, config.TFLITE_MODEL_FILE)
    with open(fp32_path, "wb") as fh:
        fh.write(fp32)
    print(f"Wrote TFLite (float32) -> {fp32_path}  ({len(fp32) / 1e6:.2f} MB)")

    # Int8 dynamic-range: weights quantized to int8, activations stay float.
    # No representative dataset needed; great size/speed win with tiny accuracy
    # cost — ideal for phone/edge deployment.
    converter_q = tf.lite.TFLiteConverter.from_keras_model(model)
    converter_q.optimizations = [tf.lite.Optimize.DEFAULT]
    int8 = converter_q.convert()
    int8_path = os.path.join(
        export_dir, config.TFLITE_MODEL_FILE.replace(".tflite", "_int8.tflite")
    )
    with open(int8_path, "wb") as fh:
        fh.write(int8)
    print(f"Wrote TFLite (int8-dynamic) -> {int8_path}  ({len(int8) / 1e6:.2f} MB)")


# --------------------------------------------------------------------------- #
# ONNX
# --------------------------------------------------------------------------- #
def export_onnx(model: tf.keras.Model, export_dir: str) -> None:
    """Convert the Keras model to ONNX via tf2onnx."""
    try:
        import tf2onnx  # noqa: F401  (import validates availability)
    except Exception as exc:
        print(f"tf2onnx unavailable, skipping ONNX export: {exc}")
        return

    onnx_path = os.path.join(export_dir, config.ONNX_MODEL_FILE)
    h, w = config.IMG_SIZE
    # Static-batch (None) input spec matching the model's image input.
    spec = (tf.TensorSpec((None, h, w, 3), tf.float32, name="image"),)

    try:
        # from_keras returns (model_proto, external_storage); also writes file.
        tf2onnx.convert.from_keras(
            model, input_signature=spec, opset=13, output_path=onnx_path
        )
        print(f"Wrote ONNX -> {onnx_path}")
    except Exception as exc:  # pragma: no cover
        print(f"ONNX export failed: {exc}")


# --------------------------------------------------------------------------- #
# labels.json
# --------------------------------------------------------------------------- #
def copy_labels(export_dir: str) -> None:
    """Copy labels.json from MODELS_DIR next to the exported models."""
    src = os.path.join(config.MODELS_DIR, config.LABELS_JSON)
    dst = os.path.join(export_dir, config.LABELS_JSON)
    if os.path.exists(src):
        shutil.copyfile(src, dst)
        print(f"Copied labels -> {dst}")
    else:
        print(f"WARNING: {src} not found; run train.py first to generate it.")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _parse_args(argv: List[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export the trained model to TFLite/ONNX.")
    default_model = os.path.join(config.MODELS_DIR, config.KERAS_MODEL_FILE)
    p.add_argument(
        "--model", default=default_model,
        help="Path to the trained .keras model.",
    )
    p.add_argument(
        "--export-dir", default=config.EXPORT_DIR,
        help="Directory to write exported artifacts into.",
    )
    return p.parse_args(argv)


def main(argv: List[str]) -> int:
    args = _parse_args(argv)

    if not os.path.exists(args.model):
        print(f"Trained model not found: {args.model}")
        print("Train one first, e.g.:")
        print("    python train.py")
        return 1

    os.makedirs(args.export_dir, exist_ok=True)
    print(f"Loading model: {args.model}")
    model = tf.keras.models.load_model(args.model)

    export_tflite(model, args.export_dir)
    export_onnx(model, args.export_dir)
    copy_labels(args.export_dir)

    print("\nExport complete. Artifacts in:", args.export_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
