"""Opt-in, checksum-pinned model artifact cache (standard library only).

No model is downloaded automatically. Call download_asset() only for an explicitly
approved registry entry. Public models are cached outside the source repository.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

DEFAULT_CACHE_DIR = Path(os.environ.get("WLMS_MODEL_CACHE", "~/.cache/wlms/models")).expanduser()
DEFAULT_CACHE_LIMIT_BYTES = int(os.environ.get("WLMS_MODEL_CACHE_LIMIT_BYTES", str(2 * 1024**3)))
ALLOWED_HOSTS = {"huggingface.co", "github.com", "githubusercontent.com", "kaggle.com"}
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")


class ModelCacheError(RuntimeError):
    pass


class ApprovedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject redirects to hosts outside the explicit allowlist."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlparse(newurl).hostname not in ALLOWED_HOSTS or urlparse(newurl).scheme != "https":
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
    if not isinstance(max_bytes, int) or max_bytes <= 0 or max_bytes > DEFAULT_CACHE_LIMIT_BYTES:
        raise ModelCacheError("asset max_bytes must be positive and within the configured cache limit")
    return name, url, max_bytes


def cache_usage(cache_dir: Path = DEFAULT_CACHE_DIR) -> int:
    return sum(p.stat().st_size for p in cache_dir.iterdir() if p.is_file() and not p.name.endswith(".lock")) if cache_dir.exists() else 0


def list_cache(cache_dir: Path = DEFAULT_CACHE_DIR) -> list[dict[str, Any]]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    return [{"filename": p.name, "size_bytes": p.stat().st_size, "last_used": p.stat().st_mtime}
            for p in sorted(cache_dir.iterdir()) if p.is_file() and not p.name.endswith(".lock")]


def _evict_lru(cache_dir: Path, limit: int, protect: str) -> None:
    files = [p for p in cache_dir.iterdir() if p.is_file() and not p.name.endswith(".lock") and p.name != protect]
    usage = cache_usage(cache_dir)
    for path in sorted(files, key=lambda p: p.stat().st_atime):
        if usage <= limit:
            break
        size = path.stat().st_size
        path.unlink()
        usage -= size
    if usage > limit:
        raise ModelCacheError("cache quota cannot be met; pinned/protected artifacts occupy the limit")


def download_asset(asset: dict[str, Any], cache_dir: Path = DEFAULT_CACHE_DIR,
                  cache_limit_bytes: int = DEFAULT_CACHE_LIMIT_BYTES) -> Path:
    """Download an approved asset atomically; checksum and size are mandatory."""
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
    tmp_path: Path | None = None
    try:
        _evict_lru(cache_dir, cache_limit_bytes - max_bytes, set(pinned_assets or ()) | {name})
        request = urllib.request.Request(url, headers={"User-Agent": "WLMS-ModelCache/1.0"})
        with urllib.request.urlopen(request, timeout=45) as response:
            final_host = urlparse(response.geturl()).hostname
            if final_host not in ALLOWED_HOSTS:
                raise ModelCacheError("download redirected to a non-approved host")
            declared = response.headers.get("Content-Length")
            if declared and int(declared) > max_bytes:
                raise ModelCacheError("server-declared artifact size exceeds limit")
            digest = hashlib.sha256()
            size = 0
            with tempfile.NamedTemporaryFile(dir=cache_dir, prefix=".download-", delete=False) as temp:
                tmp_path = Path(temp.name)
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
            tmp_path.replace(target)
            target.touch()
            return target
    except ModelCacheError:
        raise
    except Exception as exc:
        raise ModelCacheError(f"download failed: {exc}") from exc
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink()
        try:
            lock.unlink()
        except FileNotFoundError:
            pass


def load_catalog(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("models"), list):
        raise ModelCacheError("catalog must contain a models array")
    return payload
