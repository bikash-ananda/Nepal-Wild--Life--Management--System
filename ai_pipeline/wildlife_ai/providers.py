"""Minimal plugin contracts; model runtimes are intentionally optional."""

from __future__ import annotations

from typing import Protocol, Sequence

from .schemas import Detection


class AnimalDetector(Protocol):
    model_id: str

    def detect(self, image: bytes) -> Sequence[Detection]: ...


class SpeciesClassifier(Protocol):
    model_id: str

    def classify(self, image: bytes, animal_boxes: Sequence[Detection]) -> Sequence[Detection]: ...


class WildlifeEmbedder(Protocol):
    model_id: str
    embedding_dimension: int

    def embed(self, animal_crop: bytes) -> Sequence[float]: ...


class ModelUnavailable(RuntimeError):
    """Raised when a provider is not configured; callers must route to review."""
