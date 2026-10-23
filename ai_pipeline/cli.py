"""Offline CLI for evaluating normalized model output without model installs."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .wildlife_ai.consensus import ConsensusConfig, evaluate_consensus


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate wildlife model consensus JSON")
    parser.add_argument("input", type=Path, help="Path to normalized model-output JSON")
    parser.add_argument("--monkey-threshold", type=float, default=0.80)
    parser.add_argument("--species-threshold", type=float, default=0.80)
    parser.add_argument("--iou-threshold", type=float, default=0.30)
    args = parser.parse_args()
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        config = ConsensusConfig(
            monkey_detector_min_score=args.monkey_threshold,
            species_classifier_min_score=args.species_threshold,
            minimum_iou=args.iou_threshold,
        )
        result = evaluate_consensus(payload, config)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
