"""Translate the existing SPARROW detector response to normalized detections."""

from __future__ import annotations

from typing import Any

from .schemas import Detection


def adapt_sparrow_detections(payload: Any, *, default_model_id: str = "unknown") -> list[Detection]:
    """Accept current API xyxy objects or normalized xyxy arrays.

    The existing Fastify API stores normalized xyxy coordinates in an object.
    Labels, confidence and model identifiers are retained for consensus auditing.
    """
    if isinstance(payload, dict):
        detections = payload.get("detections", [])
        default_model_id = str(payload.get("model_id") or default_model_id)
    else:
        detections = payload
    if not isinstance(detections, list):
        raise ValueError("SPARROW detections must be an array")

    result: list[Detection] = []
    for item in detections[:500]:
        if not isinstance(item, dict):
            raise ValueError("each SPARROW detection must be an object")
        bbox = item.get("bbox")
        if isinstance(bbox, dict):
            bbox = [bbox.get("x_min"), bbox.get("y_min"), bbox.get("x_max"), bbox.get("y_max")]
        normalized = {
            "label": item.get("label") or "unknown",
            "confidence": item.get("confidence"),
            "bbox": bbox,
            "model_id": item.get("model_id") or default_model_id,
        }
        result.append(Detection.parse(normalized, default_model_id))
    return result
