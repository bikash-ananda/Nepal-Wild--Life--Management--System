"""Smoke tests for the YOLO26 benchmark report format."""
import unittest
from pathlib import Path
from unittest.mock import patch

from ai_pipeline.yolo26_benchmark import benchmark


class BenchmarkTests(unittest.TestCase):
    def test_benchmark_reports_latency_and_no_accuracy_claim(self):
        fake_detection = object()
        class FakeProvider:
            def __init__(self, model_name, **kwargs):
                self.model_id = "fake:" + model_name
            def detect(self, image):
                return [fake_detection, fake_detection]
        with patch("ai_pipeline.yolo26_benchmark.YOLO26Provider", FakeProvider), \\\n             patch.object(Path, "read_bytes", return_value=b"fake image bytes"):
             result = benchmark(["mock.pt"], [Path("a.jpg")], "cpu", 0.2)
        report = result["results"][0]
        self.assertEqual(report["images"], 1)
        self.assertEqual(report["total_detections"], 2)
        self.assertIn("does not measure accuracy", report["note"])


if __name__ == "__main__":
    unittest.main()
