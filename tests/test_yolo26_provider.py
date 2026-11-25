"""Unit tests for the optional YOLO26 provider helpers."""
import unittest

from ai_pipeline.wildlife_ai.yolo26_provider import normalize_xyxy


class YOLO26ProviderTests(unittest.TestCase):
    def test_pixel_box_normalizes_to_unit_range(self):
        self.assertEqual(normalize_xyxy([100, 50, 300, 250], 400, 300),
                         (0.25, 1 / 6, 0.75, 5 / 6))

    def test_clamps_outside_image(self):
        self.assertEqual(normalize_xyxy([-10, -5, 120, 80], 100, 100),
                         (0.0, 0.0, 1.0, 0.8))

    def test_rejects_degenerate_box(self):
        with self.assertRaises(ValueError):
            normalize_xyxy([10, 10, 10, 20], 100, 100)

    def test_rejects_invalid_dimensions(self):
        with self.assertRaises(ValueError):
            normalize_xyxy([0, 0, 1, 1], 0, 10)


if __name__ == "__main__":
    unittest.main()
