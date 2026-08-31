#!/usr/bin/env python3
"""Safe-width layout for Motion text render copies.

The Studio project stays untouched. Long Track-2 titles are expanded into a few
single-line render clips so FFmpeg drawtext never has to clip a title at the
canvas edge.
"""
from __future__ import annotations

import copy

_FORMAT_SIZE = {
    "9:16": (540.0, 960.0),
    "16:9": (960.0, 540.0),
    "1:1": (540.0, 540.0),
}
_NARROW = set(" ilI.,'!|:;`\"")
_WIDE = set("MW@#%&QO0")


def _clamp(value, low, high):
    try:
        value = float(value)
    except (TypeError, ValueError):
        value = low
    return max(low, min(high, value))


def _units(text: str) -> float:
    total = 0.0
    for ch in str(text):
        if ch in _NARROW:
            total += 0.34 if ch != " " else 0.32
        elif ch in _WIDE:
            total += 0.92
        elif ch.isupper():
            total += 0.70
        elif ch.isdigit():
            total += 0.62
        else:
            total += 0.58
    return total


def estimate_width(text: str, font_size: float) -> float:
    """Conservative browser-canvas width estimate in Studio preview pixels."""
    return _units(text) * max(1.0, float(font_size))


def _hard_chunks(word: str, font_size: float, available: float):
    chunks, chunk = [], ""
    for ch in word:
        candidate = chunk + ch
        if chunk and estimate_width(candidate, font_size) > available:
            chunks.append(chunk)
            chunk = ch
        else:
            chunk = candidate
    if chunk:
        chunks.append(chunk)
    return chunks or [word]


def wrap_lines(text: str, font_size: float, available: float):
    words = str(text or "").strip().split()
    if not words:
        return []
    expanded = []
    for word in words:
        if estimate_width(word, font_size) <= available:
            expanded.append(word)
        else:
            expanded.extend(_hard_chunks(word, font_size, available))
    lines, line = [], ""
    for word in expanded:
        candidate = f"{line} {word}" if line else word
        if line and estimate_width(candidate, font_size) > available:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def layout_motion_text(clip: dict, fmt: str = "9:16", max_lines: int = 4):
    width, height = _FORMAT_SIZE.get(fmt, _FORMAT_SIZE["9:16"])
    style = str(clip.get("textStyle", "title"))
    pad = 12.0 if style == "label" else (20.0 if style == "callout" else 18.0)
    safe_width = width * 0.86
    available = max(40.0, safe_width - pad * 2.0)
    requested = _clamp(clip.get("fontSize", 40), 16, 84)
    size = requested
    lines = wrap_lines(clip.get("name", ""), size, available)
    while len(lines) > max_lines and size > 16:
        size = max(16.0, size - 1.0)
        lines = wrap_lines(clip.get("name", ""), size, available)
    if not lines:
        lines = [""]
    max_width = max((estimate_width(line, size) for line in lines), default=0.0)
    # Keep the whole text block inside the same 86% safe-width used by preview.
    max_offset = max(0.0, ((safe_width - max_width) / 2.0) / width * 100.0)
    text_x = _clamp(clip.get("textX", 0), -max_offset, max_offset)
    base_y = _clamp(clip.get("textY", -28), -45, 45)
    line_step_pct = (size * 1.28 / height) * 100.0
    return {
        "fontSize": size,
        "lines": lines,
        "textX": text_x,
        "textY": base_y,
        "lineStepPct": line_step_pct,
        "safeWidth": safe_width,
        "maxWidth": max_width,
    }


def expand_motion_text(project: dict) -> dict:
    """Return a render-only copy with safe single-line Track-2 drawtext clips."""
    out = copy.deepcopy(project)
    fmt = str(out.get("format", "9:16"))
    expanded = []
    for clip in out.get("clips", []):
        if int(clip.get("track", -1)) != 2 or not str(clip.get("name", "")).strip():
            expanded.append(clip)
            continue
        layout = layout_motion_text(clip, fmt)
        lines = layout["lines"]
        center = (len(lines) - 1) / 2.0
        for index, line in enumerate(lines):
            clone = copy.deepcopy(clip)
            clone["id"] = f"{clip.get('id', 'motion')}__render_line_{index}"
            clone["name"] = line
            clone["fontSize"] = layout["fontSize"]
            clone["textX"] = layout["textX"]
            clone["textY"] = _clamp(
                layout["textY"] + (index - center) * layout["lineStepPct"], -45, 45
            )
            expanded.append(clone)
    out["clips"] = expanded
    return out
