import math
import unittest

from ai_pipeline.wildlife_ai.consensus import evaluate_consensus
from ai_pipeline.wildlife_ai.reidentification import (
    IdentityCandidate,
    match_individual,
)
from ai_pipeline.wildlife_ai.schemas import Box, Detection, finite_vector
from ai_pipeline.wildlife_ai.speciesnet_adapter import adapt_speciesnet_output
from ai_pipeline.wildlife_ai.sparrow_adapter import adapt_sparrow_detections


def valid_payload():
    return {
        "capture_id": "capture-1",
        "megadetector": {
            "model_id": "megadetector-test",
            "detections": [
                {"label": "animal", "confidence": 0.93, "bbox": [0.1, 0.1, 0.9, 0.9]}
            ],
        },
        "monkey_detector": {
            "model_id": "monkey-test",
            "detections": [
                {"label": "rhesus macaque", "confidence": 0.91, "bbox": [0.2, 0.2, 0.6, 0.65]}
            ],
        },
        "species_classifier": {
            "model_id": "species-test",
            "detections": [
                {"label": "mammalia;primates;macaca mulatta", "confidence": 0.87, "bbox": [0.21, 0.21, 0.59, 0.64]}
            ],
        },
    }


class ConsensusTests(unittest.TestCase):
    def test_spatial_high_confidence_consensus_stays_unverified(self):
        result = evaluate_consensus(valid_payload())
        self.assertEqual(result["status"], "consensus_candidate")
        self.assertFalse(result["human_verified"])
        self.assertEqual(len(result["candidates"]), 1)
        self.assertEqual(result["candidates"][0]["label"], "monkey_candidate")

    def test_missing_model_routes_to_review(self):
        payload = valid_payload()
        del payload["monkey_detector"]
        result = evaluate_consensus(payload)
        self.assertEqual(result["status"], "needs_review")
        self.assertFalse(result["candidates"])
        self.assertIn("monkey_detector", result["reasons"][0])

    def test_low_score_routes_to_review(self):
        payload = valid_payload()
        payload["species_classifier"]["detections"][0]["confidence"] = 0.79
        self.assertEqual(evaluate_consensus(payload)["status"], "needs_review")

    def test_person_overlap_blocks_candidate(self):
        payload = valid_payload()
        payload["megadetector"]["detections"].append({
            "label": "person", "confidence": 0.92, "bbox": [0.25, 0.25, 0.55, 0.55]
        })
        result = evaluate_consensus(payload)
        self.assertEqual(result["status"], "needs_review")
        self.assertFalse(result["candidates"])

    def test_dog_overlap_blocks_candidate(self):
        payload = valid_payload()
        payload["monkey_detector"]["detections"].append({
            "label": "dog", "confidence": 0.94, "bbox": [0.25, 0.25, 0.55, 0.55]
        })
        result = evaluate_consensus(payload)
        self.assertEqual(result["status"], "needs_review")
        self.assertFalse(result["candidates"])

    def test_spatial_disagreement_routes_to_review(self):
        payload = valid_payload()
        payload["species_classifier"]["detections"][0]["bbox"] = [0.7, 0.7, 0.9, 0.9]
        self.assertEqual(evaluate_consensus(payload)["status"], "needs_review")


class ValidationTests(unittest.TestCase):
    def test_invalid_numbers_and_text_embeddings_are_rejected(self):
        with self.assertRaises(ValueError):
            Box.parse([0, 0, math.inf, 1])
        with self.assertRaises(ValueError):
            Detection.parse({"label": "animal", "confidence": 1.2, "bbox": [0, 0, 1, 1]})
        with self.assertRaises(ValueError):
            Detection.parse({"label": "animal", "confidence": True, "bbox": [0, 0, 1, 1]})
        with self.assertRaises(ValueError):
            finite_vector("12")

    def test_sparrow_adapter_validates_confidence(self):
        with self.assertRaises(ValueError):
            adapt_sparrow_detections([
                {"label": "animal", "confidence": math.nan, "bbox": [0, 0, 1, 1]}
            ])

    def test_speciesnet_adapter_normalizes_xywh_and_validates_score(self):
        payload = {
            "predictions": [{
                "filepath": "frame.jpg",
                "model_version": "test-model",
                "detections": [{
                    "bbox": [0.2, 0.2, 0.3, 0.4],
                    "processed_classification": {"class": "Macaca mulatta", "score": 0.9},
                }],
            }]
        }
        detections, model_id = adapt_speciesnet_output(payload, filepath="frame.jpg")
        self.assertEqual(model_id, "test-model")
        coordinates = (
            detections[0].bbox.x_min,
            detections[0].bbox.y_min,
            detections[0].bbox.x_max,
            detections[0].bbox.y_max,
        )
        for actual, expected in zip(coordinates, (0.2, 0.2, 0.5, 0.6)):
            self.assertAlmostEqual(actual, expected)
        payload["predictions"][0]["detections"][0]["processed_classification"]["score"] = 1.5
        with self.assertRaises(ValueError):
            adapt_speciesnet_output(payload, filepath="frame.jpg")


class ReidentificationTests(unittest.TestCase):
    def test_match_ambiguous_and_new_candidate_states(self):
        exact = IdentityCandidate("Monkey_A", (1, 0))
        self.assertEqual(
            match_individual((1, 0), [exact])["state"],
            "matched_candidate",
        )
        close = IdentityCandidate("Monkey_B", (0.999, 0.045))
        self.assertEqual(
            match_individual((1, 0), [exact, close])["state"],
            "ambiguous",
        )
        distant = IdentityCandidate("Monkey_C", (0, 1))
        self.assertEqual(
            match_individual((1, 0), [distant])["state"],
            "new_individual_candidate",
        )

    def test_empty_identity_id_is_rejected(self):
        with self.assertRaises(ValueError):
            IdentityCandidate("  ", (1, 0))


if __name__ == "__main__":
    unittest.main()
