"""Unit tests for model cache validation and integrity safeguards."""
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ai_pipeline.wildlife_ai.model_cache import (
    ModelCacheError, cache_usage, download_asset, list_cache, validate_asset,
)


class FakeResponse:
    def __init__(self, payload, url="https://huggingface.co/example/file"):
        self.payload = payload
        self.url = url
        self.headers = {"Content-Length": str(len(payload))}
    def __enter__(self): return self
    def __exit__(self, *args): return None
    def read(self, size=-1):
        if not self.payload: return b""
        if size < 0:
            data, self.payload = self.payload, b""
            return data
        data, self.payload = self.payload[:size], self.payload[size:]
        return data
    def geturl(self): return self.url


class FakeOpener:
    def __init__(self, response): self.response = response
    def open(self, request, timeout=45): return self.response


class ModelCacheTests(unittest.TestCase):
    def asset(self, payload=b"test model"):
        return {"filename":"demo-model.bin", "url":"https://huggingface.co/example/file",
                "sha256":hashlib.sha256(payload).hexdigest(), "max_bytes":1024}

    def test_requires_https_approved_host_and_checksum(self):
        bad = self.asset()
        bad["url"] = "http://huggingface.co/file"
        with self.assertRaises(ModelCacheError): validate_asset(bad)
        bad = self.asset()
        bad["url"] = "https://example.org/file"
        with self.assertRaises(ModelCacheError): validate_asset(bad)
        bad = self.asset()
        bad.pop("sha256")
        with self.assertRaises(ModelCacheError): validate_asset(bad)

    def test_download_verified_artifact_atomically(self):
        payload = b"test model"
        with tempfile.TemporaryDirectory() as td:
            with patch("ai_pipeline.wildlife_ai.model_cache.urllib.request.build_opener",
                       return_value=FakeOpener(FakeResponse(payload))):
                saved = download_asset(self.asset(payload), Path(td), cache_limit_bytes=2048)
            self.assertEqual(saved.read_bytes(), payload)
            self.assertEqual(cache_usage(Path(td)), len(payload))
            self.assertEqual(list_cache(Path(td))[0]["filename"], saved.name)

    def test_checksum_mismatch_is_rejected_and_temp_removed(self):
        payload = b"not the expected data"
        asset = self.asset(b"expected")
        with tempfile.TemporaryDirectory() as td:
            with patch("ai_pipeline.wildlife_ai.model_cache.urllib.request.build_opener",
                       return_value=FakeOpener(FakeResponse(payload))):
                with self.assertRaises(ModelCacheError):
                    download_asset(asset, Path(td), cache_limit_bytes=2048)
            self.assertEqual(list(Path(td).glob(".download-*")), [])

    def test_oversize_payload_rejected(self):
        payload = b"123456789"
        asset = self.asset(payload)
        asset["max_bytes"] = 5
        with tempfile.TemporaryDirectory() as td:
            with patch("ai_pipeline.wildlife_ai.model_cache.urllib.request.build_opener",
                       return_value=FakeOpener(FakeResponse(payload))):
                with self.assertRaises(ModelCacheError):
                    download_asset(asset, Path(td), cache_limit_bytes=2048)

    def test_cache_evicts_unpinned_old_file_to_fit_quota(self):\n        payload = b"new"\n        with tempfile.TemporaryDirectory() as td:\n            old = Path(td) / "old.bin"\n            old.write_bytes(b"1234")\n            with patch("ai_pipeline.wildlife_ai.model_cache.urllib.request.build_opener",\n                       return_value=FakeOpener(FakeResponse(payload))):\n                download_asset(self.asset(payload), Path(td), cache_limit_bytes=5)\n            self.assertFalse(old.exists())\n            self.assertLessEqual(cache_usage(Path(td)), 5)\n\n    def test_pinned_file_is_not_evicted_and_quota_error_is_clear(self):\n        payload = b"new"\n        with tempfile.TemporaryDirectory() as td:\n            pinned = Path(td) / "pinned.bin"\n            pinned.write_bytes(b"1234")\n            with patch("ai_pipeline.wildlife_ai.model_cache.urllib.request.build_opener",\n                       return_value=FakeOpener(FakeResponse(payload))):\n                with self.assertRaises(ModelCacheError):\n                    download_asset(self.asset(payload), Path(td), cache_limit_bytes=5,\n                                  pinned_assets={"pinned.bin"})\n            self.assertTrue(pinned.exists())\n\n    def test_redirect_to_unapproved_host_is_rejected(self):
        payload = b"abc"
        with tempfile.TemporaryDirectory() as td:
            with patch("ai_pipeline.wildlife_ai.model_cache.urllib.request.build_opener",
                       return_value=FakeOpener(FakeResponse(payload, "https://example.org/file"))):
                with self.assertRaises(ModelCacheError):
                    download_asset(self.asset(payload), Path(td), cache_limit_bytes=2048)


if __name__ == "__main__":
    unittest.main()
