#!/usr/bin/env python3
"""Small file-based progress protocol shared by ProfitMente local render stages."""
from __future__ import annotations
import json
import os
import pathlib
import time

ENV_NAME = "PROFITMENTE_PROGRESS_FILE"


def _clean_progress(value) -> int:
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        number = 0
    return max(0, min(99, number))


def _clean_phase(value) -> str:
    text = " ".join(str(value or "").strip().split())
    return text[:120]


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
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(target.name + ".tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        temporary.replace(target)
        return True
    except OSError:
        # Rendering must never fail because the optional UI progress channel failed.
        return False


def read_progress(path):
    """Read and sanitize a progress snapshot; malformed/partial files are ignored."""
    if not path:
        return None
    target = pathlib.Path(path)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(value, dict):
        return None
    return {
        "progress": _clean_progress(value.get("progress")),
        "phase": _clean_phase(value.get("phase")),
        "updated": float(value.get("updated") or 0),
    }
