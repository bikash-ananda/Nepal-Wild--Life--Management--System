"""Strict spatial consensus across animal gate and species-capable models."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any

from .schemas import Detection, model_id, parse_detections


MONKEY_LABELS = {
    "monkey",
    "macaque",
    "rhesus macaque",
    "rhesus monkey",
    "macaca mulatta",
}
PERSON_LABELS = {"person", "human", "people"}
DOG_LABELS = {"dog", "domestic dog", "canis lupus familiaris"}
ANIMAL_LABELS = {"animal", "wildlife"}


@dataclass(frozen=True)
class ConsensusConfig:
    # Defaults are conservative starting points, not calibrated probabilities.
    monkey_detector_min_score: float = 0.80
    species_classifier_min_score: float = 0.80
    animal_gate_min_score: float = 0.15
    person_gate_min_score: float = 0.15
    contradiction_min_score: float = 0.20
    minimum_iou: float = 0.30
    minimum_animal_coverage: float = 0.50
    minimum_conflict_coverage: float = 0.25

    def __post_init__(self) -> None:
        for name, value in asdict(self).items():
            if not 0 <= value <= 1:
                raise ValueError(f"{name} must be between 0 and 1")


def intersection_over_union(left: Detection, right: Detection) -> float:
    a, b = left.bbox, right.bbox
    x1, y1 = max(a.x_min, b.x_min), max(a.y_min, b.y_min)
    x2, y2 = min(a.x_max, b.x_max), min(a.y_max, b.y_max)
    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection == 0:
        return 0.0
    area_a = (a.x_max - a.x_min) * (a.y_max - a.y_min)
    area_b = (b.x_max - b.x_min) * (b.y_max - b.y_min)
    return intersection / (area_a + area_b - intersection)


def intersection_over_candidate(candidate: Detection, other: Detection) -> float:
    """Fraction of candidate area covered by the other detection."""
    a, b = candidate.bbox, other.bbox
    x1, y1 = max(a.x_min, b.x_min), max(a.y_min, b.y_min)
    x2, y2 = min(a.x_max, b.x_max), min(a.y_max, b.y_max)
    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    candidate_area = (a.x_max - a.x_min) * (a.y_max - a.y_min)
    return intersection / candidate_area if candidate_area else 0.0


def _best_overlap(
    candidate: Detection,
    others: list[Detection],
    labels: set[str],
    threshold: float,
) -> Detection | None:
    matches = [
        other for other in others
        if other.label in labels and intersection_over_union(candidate, other) >= threshold
    ]
    return max(matches, key=lambda item: item.confidence, default=None)


def _best_covering(
    candidate: Detection,
    others: list[Detection],
    labels: set[str],
    minimum_coverage: float,
) -> Detection | None:
    matches = [
        other for other in others
        if other.label in labels and intersection_over_candidate(candidate, other) >= minimum_coverage
    ]
    return max(matches, key=lambda item: item.confidence, default=None)


def _is_monkey_label(label: str) -> bool:
    normalized = label.casefold().strip()
    if normalized in MONKEY_LABELS:
        return True
    # SpeciesNet may return a semicolon-delimited taxonomic path.
    return any(part.strip() in MONKEY_LABELS for part in re.split(r"[;|>/]+", normalized))


def evaluate_consensus(
    payload: dict[str, Any],
    config: ConsensusConfig | None = None,
) -> dict[str, Any]:
    """Return an unverified candidate/review result from normalized model output."""
    settings = config or ConsensusConfig()
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")

    raw_models = {
        key: payload.get(key)
        for key in ("megadetector", "monkey_detector", "species_classifier")
    }
    model_ids = {key: model_id(value) for key, value in raw_models.items()}
    missing = [key for key, value in raw_models.items() if not isinstance(value, dict)]
    parsed = {
        key: parse_detections(value, model_ids[key])
        for key, value in raw_models.items()
        if isinstance(value, dict)
    }

    md = parsed.get("megadetector", [])
    monkey_model = parsed.get("monkey_detector", [])
    species_model = parsed.get("species_classifier", [])
    monkey_predictions = [
        item for item in monkey_model
        if _is_monkey_label(item.label) and item.confidence >= settings.monkey_detector_min_score
    ]
    species_monkeys = [
        item for item in species_model
        if _is_monkey_label(item.label) and item.confidence >= settings.species_classifier_min_score
    ]
    people = [item for item in md if item.label in PERSON_LABELS and item.confidence >= settings.person_gate_min_score]
    contradictions = [
        item for item in species_model + monkey_model
        if item.label in PERSON_LABELS | DOG_LABELS and item.confidence >= settings.contradiction_min_score
    ]
    animals = [item for item in md if item.label in ANIMAL_LABELS and item.confidence >= settings.animal_gate_min_score]

    reasons: list[str] = []
    candidates: list[dict[str, Any]] = []
    for monkey_vote in sorted(monkey_predictions, key=lambda item: item.confidence, reverse=True):
        species_vote = _best_overlap(monkey_vote, species_monkeys, {item.label for item in species_monkeys}, settings.minimum_iou)
        if species_vote is None:
            continue
        animal_gate = _best_covering(monkey_vote, animals, ANIMAL_LABELS, settings.minimum_animal_coverage)
        if animal_gate is None:
            continue
        person_overlap = _best_covering(monkey_vote, people, PERSON_LABELS, settings.minimum_conflict_coverage)
        contradiction = _best_covering(monkey_vote, contradictions, PERSON_LABELS | DOG_LABELS, settings.minimum_conflict_coverage)
        if person_overlap or contradiction:
            continue
        candidates.append({
            "label": "monkey_candidate",
            "human_verified": False,
            "bbox": [monkey_vote.bbox.x_min, monkey_vote.bbox.y_min, monkey_vote.bbox.x_max, monkey_vote.bbox.y_max],
            "votes": {
                "monkey_detector": {"model_id": monkey_vote.model_id, "label": monkey_vote.label, "score": monkey_vote.confidence},
                "species_classifier": {"model_id": species_vote.model_id, "label": species_vote.label, "score": species_vote.confidence},
                "animal_gate": {"model_id": animal_gate.model_id, "label": animal_gate.label, "score": animal_gate.confidence},
            },
            "box_iou": {
                "classifier": round(intersection_over_union(monkey_vote, species_vote), 4),
                "animal_gate_coverage": round(intersection_over_candidate(monkey_vote, animal_gate), 4),
            },
        })

    if candidates:
        status = "consensus_candidate"
        reasons.append("Two species-capable models agree on an overlapping monkey candidate; the animal gate corroborates it.")
    else:
        status = "needs_review"
        if missing:
            reasons.append("Required model output is unavailable: " + ", ".join(sorted(missing)) + ".")
        if not monkey_predictions:
            reasons.append("No monkey-specific detector prediction met its configured threshold.")
        elif not species_monkeys:
            reasons.append("No species-classifier monkey prediction met its configured threshold.")
        elif not animals:
            reasons.append("No overlapping animal-gate detection met its configured threshold.")
        elif people or contradictions:
            reasons.append("A person or dog result overlaps the candidate; manual review is required.")
        else:
            reasons.append("Model predictions do not spatially agree; manual review is required.")

    return {
        "capture_id": str(payload.get("capture_id", ""))[:180],
        "status": status,
        "human_verified": False,
        "reasons": reasons,
        "model_ids": model_ids,
        "thresholds": asdict(settings),
        "candidates": candidates,
    }
