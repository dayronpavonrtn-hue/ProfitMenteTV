#!/usr/bin/env python3
"""Small file-based progress protocol shared by ProfitMente local render stages."""
from __future__ import annotations
import json
import os
import pathlib
import tempfile
import time

ENV_NAME = "PROFITMENTE_PROGRESS_FILE"


def _clean_progress(value) -> int:
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError, OverflowError):
        # Progress is optional UI metadata. NaN/Infinity or otherwise malformed
        # values must not interrupt rendering or progress polling.
        number = 0
    return max(0, min(99, number))


def _clean_phase(value) -> str:
    text = " ".join(str(value or "").strip().split())
    return text[:120]


def _clean_updated(value) -> float:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    # Reject NaN/Infinity without adding a dependency: finite numbers are the
    # only timestamps that remain unchanged after subtracting themselves.
    if number != number or number in (float("inf"), float("-inf")):
        return 0.0
    return max(0.0, number)


def write_progress(progress, phase, path=None) -> bool:
    """Atomically publish render progress. No-op when async progress is not requested."""
    target_value = path or os.environ.get(ENV_NAME)
    if not target_value:
        return False
    target = pathlib.Path(target_value)
    payload = {
        "progress": _clean_progress(progress),
        "phase": _clean_phase(phase),
        "updated": time.time(),
    }
    temporary = None
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        # Each writer gets its own temporary file. A fixed ``progress.json.tmp``
        # can collide when render stages overlap, causing one process to replace
        # another process's temporary file or fail with FileNotFoundError.
        fd, temporary_name = tempfile.mkstemp(
            prefix=target.name + ".",
            suffix=".tmp",
            dir=str(target.parent),
        )
        temporary = pathlib.Path(temporary_name)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, target)
        temporary = None
        return True
    except OSError:
        # Rendering must never fail because the optional UI progress channel failed.
        return False
    finally:
        if temporary is not None:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass


def read_progress(path):
    """Read and sanitize a progress snapshot; malformed/partial files are ignored."""
    if not path:
        return None
    target = pathlib.Path(path)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        # The progress channel is optional. A partially written, corrupt, or
        # non-UTF8 snapshot must never interrupt the render server/UI polling.
        return None
    if not isinstance(value, dict):
        return None
    return {
        "progress": _clean_progress(value.get("progress")),
        "phase": _clean_phase(value.get("phase")),
        "updated": _clean_updated(value.get("updated")),
    }
