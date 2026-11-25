"""Repeatable offline YOLO26 speed/detection-count benchmark (no accuracy claim)."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from statistics import median

from .wildlife_ai.yolo26_provider import YOLO26Provider


def benchmark(model_names: list[str], image_paths: list[Path], device: str, confidence: float) -> dict:
    reports = []
    for model_name in model_names:
        provider = YOLO26Provider(model_name, device=device, confidence=confidence)
        durations: list[float] = []
        detections_by_image: list[int] = []
        for image_path in image_paths:
            image_bytes = image_path.read_bytes()
            started = time.perf_counter()
            detections = provider.detect(image_bytes)
            durations.append((time.perf_counter() - started) * 1000)
            detections_by_image.append(len(detections))
        reports.append({
            "model_id": provider.model_id,
            "images": len(image_paths),
            "total_detections": sum(detections_by_image),
            "avg_detections_per_image": (sum(detections_by_image) / len(detections_by_image)) if detections_by_image else 0,
            "mean_latency_ms": (sum(durations) / len(durations)) if durations else None,
            "median_latency_ms": median(durations) if durations else None,
            "p95_latency_ms": sorted(durations)[max(0, int(0.95 * len(durations)) - 1)] if durations else None,
            "device": device,
            "confidence_threshold": confidence,
            "note": "Latency includes provider inference and image decoding; this report does not measure accuracy or calibrated confidence.",
        })
    return {"benchmark_type": "inference_latency_only", "results": reports}


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark YOLO26 inference on a local image folder")
    parser.add_argument("image_dir", type=Path)
    parser.add_argument("--models", nargs="+", default=["yolo26n.pt", "yolo26s.pt"])
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--confidence", type=float, default=0.25)
    parser.add_argument("--output", type=Path, default=Path("yolo26-benchmark.json"))
    args = parser.parse_args()
    images = sorted(path for path in args.image_dir.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not images:
        parser.error("image directory contains no supported image files")
    report = benchmark(args.models, images, args.device, args.confidence)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
