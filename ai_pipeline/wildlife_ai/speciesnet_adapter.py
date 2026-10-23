"""Translate official SpeciesNet JSON output to the local normalized schema."""

from __future__ import annotations

from typing import Any

from .schemas import Box, Detection


_MODEL_ID = "speciesnet"


def _bbox_xywh_to_xyxy(value: Any) -> Box:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        raise ValueError("SpeciesNet bbox must contain normalized [x, y, width, height]")
    x, y, width, height = (float(part) for part in value)
    return Box.parse([x, y, x + width, y + height])


def adapt_speciesnet_output(
    payload: Any,
    *,
    filepath: str | None = None,
) -> tuple[list[Detection], str]:
    """Return processed species predictions for one image and its model version.

    SpeciesNet's `run_model` JSON uses a prediction array and xywh boxes. The
    adapter fails closed when the requested image failed or has no classified
    detections; unclassified animal boxes are not species votes.
    """
    if not isinstance(payload, dict) or not isinstance(payload.get("predictions"), list):
        raise ValueError("SpeciesNet output must contain a predictions array")
    predictions = payload["predictions"]
    if filepath is not None:
        predictions = [item for item in predictions if isinstance(item, dict) and item.get("filepath") == filepath]
    if len(predictions) != 1 or not isinstance(predictions[0], dict):
        raise ValueError("Expected exactly one SpeciesNet prediction for the requested image")

    prediction = predictions[0]
    failures = prediction.get("failures") or []
    if "CLASSIFIER" in failures:
        raise ValueError("SpeciesNet classifier failed; route this image to human review")
    version = str(prediction.get("model_version") or _MODEL_ID)[:120]
    result: list[Detection] = []
    for item in prediction.get("detections", []):
        if not isinstance(item, dict):
            continue
        classification = item.get("processed_classification")
        if not isinstance(classification, dict):
            continue
        label = str(classification.get("class") or "").strip()
        score = classification.get("score")
        if not label or score is None:
            continue
        bbox = _bbox_xywh_to_xyxy(item.get("bbox"))
        result.append(Detection.parse({
            "label": label,
            "confidence": score,
            "bbox": [bbox.x_min, bbox.y_min, bbox.x_max, bbox.y_max],
            "model_id": version,
        }, version))
    return result, version
