"""Opt-in, checksum-pinned model artifact cache (standard library only).

No model downloads happen automatically. Call download_asset() only for an explicitly
approved registry entry. Cache files live outside the source repository by default.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

DEFAULT_CACHE_DIR = Path(os.environ.get("WLMS_MODEL_CACHE", "~/.cache/wlms/models")).expanduser()
DEFAULT_CACHE_LIMIT_BYTES = int(os.environ.get("WLMS_MODEL_CACHE_LIMIT_BYTES", str(2 * 1024**3)))
ALLOWED_HOSTS = {"huggingface.co", "github.com", "githubusercontent.com", "kaggle.com"}
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")


class ModelCacheError(RuntimeError):
    """Raised for artifact validation, download, or quota errors."""


class ApprovedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Block redirect destinations outside the HTTPS host allowlist."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise ModelCacheError("redirect to non-approved host rejected")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def validate_asset(asset: dict[str, Any]) -> tuple[str, str, int]:
    name, url, digest = asset.get("filename"), asset.get("url"), asset.get("sha256")
    max_bytes = asset.get("max_bytes")
    if not isinstance(name, str) or not NAME_RE.fullmatch(name) or name in {".", ".."}:
        raise ModelCacheError("invalid model filename")
    parsed = urlparse(url or "")
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ModelCacheError("URL must use HTTPS and an approved host")
    if not isinstance(digest, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", digest):
        raise ModelCacheError("a pinned SHA-256 checksum is required")
    if not isinstance(max_bytes, int) or isinstance(max_bytes, bool) or max_bytes <= 0 or max_bytes > DEFAULT_CACHE_LIMIT_BYTES:
        raise ModelCacheError("asset max_bytes must be positive and within the configured cache limit")
    return name, url, max_bytes


def cache_usage(cache_dir: Path = DEFAULT_CACHE_DIR) -> int:
    if not cache_dir.exists():
        return 0
    return sum(p.stat().st_size for p in cache_dir.iterdir()
               if p.is_file() and not p.name.endswith(".lock") and not p.name.startswith(".download-"))


def list_cache(cache_dir: Path = DEFAULT_CACHE_DIR) -> list[dict[str, Any]]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    return [{"filename": p.name, "size_bytes": p.stat().st_size, "last_used": p.stat().st_atime}
            for p in sorted(cache_dir.iterdir())
            if p.is_file() and not p.name.endswith(".lock") and not p.name.startswith(".download-")]


def _evict_lru(cache_dir: Path, target_usage: int, protected: set[str]) -> None:
    files = [p for p in cache_dir.iterdir()
             if p.is_file() and not p.name.endswith(".lock") and not p.name.startswith(".download-")
             and p.name not in protected]
    usage = cache_usage(cache_dir)
    for path in sorted(files, key=lambda p: p.stat().st_atime):
        if usage <= target_usage:
            break
        size = path.stat().st_size
        path.unlink()
        usage -= size
    if usage > target_usage:
        raise ModelCacheError("cache quota cannot be met; pinned/protected artifacts occupy the limit")


def download_asset(asset: dict[str, Any], cache_dir: Path = DEFAULT_CACHE_DIR,
                  cache_limit_bytes: int = DEFAULT_CACHE_LIMIT_BYTES,
                  pinned_assets: set[str] | None = None) -> Path:
    """Download approved artifact atomically with checksum, cap, and pinned LRU."""
    name, url, max_bytes = validate_asset(asset)
    if cache_limit_bytes <= 0 or max_bytes > cache_limit_bytes:
        raise ModelCacheError("asset exceeds configured cache quota")
    expected = asset["sha256"].lower()
    cache_dir.mkdir(parents=True, exist_ok=True)
    target = cache_dir / name
    if target.exists():
        if hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            target.touch()
            return target
        target.unlink()

    lock = cache_dir / (name + ".lock")
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise ModelCacheError("download already in progress for this artifact") from exc
    os.close(fd)
    temp_path: Path | None = None
    try:
        _evict_lru(cache_dir, cache_limit_bytes - max_bytes, set(pinned_assets or ()) | {name})
        request = urllib.request.Request(url, headers={"User-Agent": "WLMS-ModelCache/1.0"})
        opener = urllib.request.build_opener(ApprovedRedirectHandler)
        with opener.open(request, timeout=45) as response:
            if urlparse(response.geturl()).hostname not in ALLOWED_HOSTS:
                raise ModelCacheError("download redirected to non-approved host")
            declared = response.headers.get("Content-Length")
            if declared and int(declared) > max_bytes:
                raise ModelCacheError("server-declared artifact size exceeds limit")
            digest = hashlib.sha256()
            size = 0
            with tempfile.NamedTemporaryFile(dir=cache_dir, prefix=".download-", delete=False) as temp:
                temp_path = Path(temp.name)
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > max_bytes:
                        raise ModelCacheError("artifact exceeds configured size limit")
                    digest.update(chunk)
                    temp.write(chunk)
            if digest.hexdigest() != expected:
                raise ModelCacheError("SHA-256 checksum mismatch")
            temp_path.replace(target)
            target.touch()
            return target
    except ModelCacheError:
        raise
    except Exception as exc:
        raise ModelCacheError(f"download failed: {exc}") from exc
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()
        try:
            lock.unlink()
        except FileNotFoundError:
            pass


def load_catalog(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("models"), list):
        raise ModelCacheError("catalog must contain a models array")
    return payload
