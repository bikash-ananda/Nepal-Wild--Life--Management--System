"""Optional YOLO26 inference provider (Ultralytics runtime).

Weights are external artifacts; do not commit model weights. YOLO26 COCO weights
are generic object detectors and do not include a monkey class unless custom-trained.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .schemas import Detection


def normalize_xyxy(box: Any, image_width: int, image_height: int) -> tuple[float, float, float, float]:
    """Convert pixel xyxy coordinates into clamped normalized xyxy coordinates."""
    if image_width <= 0 or image_height <= 0:
        raise ValueError("image dimensions must be positive")
    values = [float(part) for part in box]
    if len(values) != 4:
        raise ValueError("box must have four xyxy values")
    x1, y1, x2, y2 = values
    x1 = min(max(x1 / image_width, 0.0), 1.0)
    y1 = min(max(y1 / image_height, 0.0), 1.0)
    x2 = min(max(x2 / image_width, 0.0), 1.0)
    y2 = min(max(y2 / image_height, 0.0), 1.0)
    if x2 <= x1 or y2 <= y1:
        raise ValueError("box must have positive area after normalization")
    return x1, y1, x2, y2


class YOLO26Provider:
    """Lazy, optional Ultralytics YOLO26 detector for image-byte inputs."""

    def __init__(
        self,
        weights: str | Path = "yolo26n.pt",
        *,
        device: str = "cpu",
        confidence: float = 0.25,
        image_size: int = 640,
        model: Any = None,
    ) -> None:
        if not 0.0 <= confidence <= 1.0:
            raise ValueError("confidence must be between 0 and 1")
        self.weights = str(weights)
        self.model_id = f"yolo26:{Path(self.weights).name}"
        self.device = device
        self.confidence = confidence
        self.image_size = image_size
        self._model = model

    def _load(self) -> Any:
        if self._model is None:
            try:
                from ultralytics import YOLO
            except ImportError as error:
                raise RuntimeError("Install the optional ultralytics runtime to use YOLO26") from error
            self._model = YOLO(self.weights)
        return self._model

    def detect(self, image: bytes) -> list[Detection]:
        if not isinstance(image, (bytes, bytearray)) or not image:
            raise ValueError("image must be non-empty bytes")
        try:
            from PIL import Image
            import io
            with Image.open(io.BytesIO(image)) as opened:
                rgb = opened.convert("RGB")
                width, height = rgb.size
                results = self._load().predict(
                    source=rgb,
                    device=self.device,
                    conf=self.confidence,
                    imgsz=self.image_size,
                    verbose=False,
                )
        except ImportError as error:
            raise RuntimeError("Install Pillow and ultralytics for YOLO26 inference") from error

        detections: list[Detection] = []
        for result in results or []:
            names = getattr(result, "names", {})
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            raw_rows = boxes.data
            if hasattr(raw_rows, "cpu"):
                raw_rows = raw_rows.cpu()
            if hasattr(raw_rows, "tolist"):
                raw_rows = raw_rows.tolist()
            for row in raw_rows or []:
                if len(row) < 6:
                    continue
                x1, y1, x2, y2, score, class_id = row[:6]
                class_id = int(class_id)
                label = names.get(class_id, str(class_id)) if isinstance(names, dict) else str(class_id)
                try:
                    normalized = normalize_xyxy([x1, y1, x2, y2], width, height)
                    detections.append(Detection.parse({
                        "label": label,
                        "confidence": float(score),
                        "bbox": normalized,
                        "model_id": self.model_id,
                    }))
                except (ValueError, TypeError):
                    continue
        return detections
