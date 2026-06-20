"""Model construction for AngaWatch Greenhouse.

Builds a transfer-learning classifier on top of an imagenet-pretrained
backbone. Two backbones are supported (selected via ``config.BACKBONE`` or the
``backbone`` argument):

  * "mobilenetv3_large" — small & fast, ideal target for phone/edge inference.
  * "efficientnet_b0"    — slightly larger, often marginally more accurate.

Each backbone has its OWN required input preprocessing. We bake the correct
preprocessing into the model graph (as a Lambda/Rescaling-style step) so the
exported TFLite/ONNX model consumes raw 0..255 RGB uint8/float images and the
inference service does not have to replicate preprocessing by hand.
"""

from __future__ import annotations

from typing import Callable, Tuple

import tensorflow as tf
from tensorflow.keras import layers, models

from config import IMG_SIZE, SUPPORTED_BACKBONES


# --------------------------------------------------------------------------- #
# Backbone registry
# --------------------------------------------------------------------------- #
def _get_backbone(
    backbone: str,
    input_shape: Tuple[int, int, int],
) -> Tuple[tf.keras.Model, Callable]:
    """Return (base_model, preprocess_fn) for the requested backbone.

    The base model is created with ``include_top=False`` and imagenet weights.
    ``preprocess_fn`` is the matching ``preprocess_input`` callable that expects
    raw 0..255 RGB float tensors.
    """
    name = backbone.lower().strip()
    if name not in SUPPORTED_BACKBONES:
        raise ValueError(
            f"Unsupported backbone {backbone!r}. "
            f"Choose one of {SUPPORTED_BACKBONES}."
        )

    if name == "mobilenetv3_large":
        from tensorflow.keras.applications import MobileNetV3Large
        from tensorflow.keras.applications.mobilenet_v3 import preprocess_input

        base = MobileNetV3Large(
            input_shape=input_shape,
            include_top=False,
            weights="imagenet",
            include_preprocessing=False,  # we apply preprocess_input ourselves
        )
        return base, preprocess_input

    # efficientnet_b0
    from tensorflow.keras.applications import EfficientNetB0
    from tensorflow.keras.applications.efficientnet import preprocess_input

    base = EfficientNetB0(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet",
    )
    return base, preprocess_input


def build_model(
    num_classes: int,
    backbone: str,
    image_size: Tuple[int, int] = IMG_SIZE,
) -> tf.keras.Model:
    """Build the classifier head on a frozen pretrained backbone.

    Architecture
    ------------
        Input (H, W, 3) raw 0..255 RGB
          -> backbone-specific preprocess_input
          -> backbone (frozen, include_top=False)
          -> GlobalAveragePooling2D
          -> Dropout(0.2)
          -> Dense(num_classes, softmax)

    The backbone starts frozen (``trainable=False``); call ``unfreeze_top`` for
    the fine-tuning phase. The model is returned UNCOMPILED — train.py compiles
    it with the appropriate optimizer/LR per phase.
    """
    input_shape = (image_size[0], image_size[1], 3)
    base, preprocess_fn = _get_backbone(backbone, input_shape)
    base.trainable = False  # phase 1: train only the head

    inputs = layers.Input(shape=input_shape, name="image")
    # Bake preprocessing into the graph so deployed models take raw RGB.
    x = layers.Lambda(preprocess_fn, name="preprocess")(inputs)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(0.2, name="dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = models.Model(inputs, outputs, name=f"angawatch_{backbone}")
    return model


def unfreeze_top(model: tf.keras.Model, n_layers: int) -> tf.keras.Model:
    """Unfreeze the top ``n_layers`` of the backbone for fine-tuning.

    Finds the inner backbone (the only nested ``tf.keras.Model`` in the graph),
    marks it trainable, then RE-freezes all but its last ``n_layers`` layers.
    BatchNormalization layers are kept frozen to preserve their running stats,
    which is the standard recipe for stable fine-tuning.

    Returns the same model (mutated in place) for convenience. Remember to
    re-compile after calling this, so the trainable-variable change takes effect.
    """
    # Locate the nested backbone model.
    base = None
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            base = layer
            break
    if base is None:
        raise RuntimeError("Could not locate the nested backbone model.")

    base.trainable = True
    total = len(base.layers)
    cut = max(0, total - int(n_layers))

    for i, layer in enumerate(base.layers):
        if i < cut:
            layer.trainable = False
        else:
            # Keep BatchNorm frozen even within the unfrozen region.
            layer.trainable = not isinstance(layer, layers.BatchNormalization)

    return model


if __name__ == "__main__":
    # Smoke test: build both backbones and print param counts.
    from config import NUM_CLASSES

    for bb in SUPPORTED_BACKBONES:
        m = build_model(NUM_CLASSES, bb)
        trainable = sum(int(tf.size(w)) for w in m.trainable_weights)
        print(f"{bb:18s} params={m.count_params():,} trainable(head)={trainable:,}")
        unfreeze_top(m, 40)
        trainable_ft = sum(int(tf.size(w)) for w in m.trainable_weights)
        print(f"{'':18s} trainable(fine-tune)={trainable_ft:,}")
