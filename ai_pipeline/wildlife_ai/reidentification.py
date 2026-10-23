"""Conservative vector matching; this module never declares identity as truth."""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable

from .schemas import finite_vector


@dataclass(frozen=True)
class IdentityCandidate:
    individual_id: str
    embedding: tuple[float, ...]
    provenance: str = ""

    def __post_init__(self) -> None:
        if not isinstance(self.individual_id, str) or not self.individual_id.strip():
            raise ValueError("individual_id is required")
        object.__setattr__(self, "embedding", finite_vector(self.embedding))


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    a, b = finite_vector(left), finite_vector(right)
    if len(a) != len(b):
        raise ValueError("embedding dimensions do not match")
    norm_a, norm_b = sqrt(sum(value * value for value in a)), sqrt(sum(value * value for value in b))
    if norm_a == 0 or norm_b == 0:
        raise ValueError("zero-length embeddings cannot be compared")
    return max(-1.0, min(1.0, sum(x * y for x, y in zip(a, b)) / (norm_a * norm_b)))


def match_individual(
    query_embedding: Iterable[float],
    candidates: Iterable[IdentityCandidate],
    *,
    minimum_similarity: float = 0.85,
    minimum_margin: float = 0.05,
) -> dict[str, object]:
    """Rank candidate identities and return a review-oriented matching state.

    Similarity cutoffs are uncalibrated starting values. A new/unknown result is
    only a candidate for review; callers must not automatically create a verified
    animal identity from this return value.
    """
    if not 0 <= minimum_similarity <= 1 or not 0 <= minimum_margin <= 2:
        raise ValueError("similarity and margin thresholds are out of range")
    query = finite_vector(query_embedding)
    ranked = sorted(
        (
            (candidate, cosine_similarity(query, candidate.embedding))
            for candidate in candidates
        ),
        key=lambda item: item[1],
        reverse=True,
    )
    top = ranked[0] if ranked else None
    runner_up = ranked[1] if len(ranked) > 1 else None
    margin = top[1] - runner_up[1] if top and runner_up else (top[1] if top else 0.0)

    if top is None or top[1] < minimum_similarity:
        state = "new_individual_candidate"
    elif margin < minimum_margin:
        state = "ambiguous"
    else:
        state = "matched_candidate"

    return {
        "state": state,
        "human_verified": False,
        "candidate_id": top[0].individual_id if top else None,
        "cosine_similarity": round(top[1], 6) if top else None,
        "runner_up_id": runner_up[0].individual_id if runner_up else None,
        "runner_up_similarity": round(runner_up[1], 6) if runner_up else None,
        "top_margin": round(margin, 6),
        "thresholds": {"minimum_similarity": minimum_similarity, "minimum_margin": minimum_margin},
    }
