"""Small validated data types shared by model adapters and decision logic."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Any, Iterable


def _finite_float(value: Any, field_name: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be numeric")
    try:
        converted = float(value)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError(f"{field_name} must be numeric") from error
    if not isfinite(converted):
        raise ValueError(f"{field_name} must be finite")
    return converted


@dataclass(frozen=True)
class Box:
    """An image box in normalized xyxy coordinates in the range [0, 1]."""

    x_min: float
    y_min: float
    x_max: float
    y_max: float

    @classmethod
    def parse(cls, value: Any) -> "Box":
        if not isinstance(value, (list, tuple)) or len(value) != 4:
            raise ValueError("bbox must contain [x_min, y_min, x_max, y_max]")
        coordinates = tuple(_finite_float(part, "bbox coordinate") for part in value)
        if not all(0 <= part <= 1 for part in coordinates):
            raise ValueError("bbox coordinates must be finite and normalized to [0, 1]")
        x_min, y_min, x_max, y_max = coordinates
        if x_max <= x_min or y_max <= y_min:
            raise ValueError("bbox must have positive width and height")
        return cls(*coordinates)


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    bbox: Box
    model_id: str = "unknown"

    @classmethod
    def parse(cls, value: Any, default_model_id: str = "unknown") -> "Detection":
        if not isinstance(value, dict):
            raise ValueError("each detection must be an object")
        label = str(value.get("label", "")).strip().casefold()
        if not label:
            raise ValueError("detection label is required")
        confidence = _finite_float(value.get("confidence"), "confidence")
        if not 0 <= confidence <= 1:
            raise ValueError("confidence must be finite and between 0 and 1")
        model_id = str(value.get("model_id") or default_model_id).strip()[:120] or "unknown"
        return cls(label, confidence, Box.parse(value.get("bbox")), model_id)


def parse_detections(payload: Any, default_model_id: str = "unknown") -> list[Detection]:
    if not isinstance(payload, dict):
        return []
    raw = payload.get("detections", [])
    if not isinstance(raw, list):
        raise ValueError("detections must be an array")
    detections: list[Detection] = []
    for item in raw[:500]:
        detections.append(Detection.parse(item, default_model_id))
    return detections


def model_id(payload: Any) -> str:
    if not isinstance(payload, dict):
        return "unavailable"
    raw_value = payload.get("model_id")
    value = str(raw_value).strip() if raw_value is not None else ""
    return value[:120] if value else "unavailable"


def finite_vector(values: Iterable[Any]) -> tuple[float, ...]:
    if isinstance(values, (str, bytes, bytearray)):
        raise ValueError("embedding must be a numeric sequence, not text")
    try:
        vector = tuple(_finite_float(value, "embedding value") for value in values)
    except TypeError as error:
        raise ValueError("embedding must be an iterable of numeric values") from error
    if not vector or not all(isfinite(value) for value in vector):
        raise ValueError("embedding must be a non-empty finite vector")
    return vector
