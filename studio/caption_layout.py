#!/usr/bin/env python3
"""Deterministic caption layout used by the local $0 MP4 renderer.

The browser preview uses Canvas text metrics. FFmpeg drawtext does not expose those
metrics before filter construction, so this module uses a conservative glyph-width
estimate to keep the final MP4 inside the same 88% safe width and three-line limit.
"""
from __future__ import annotations
import builtins
import math


def _finite(value, fallback: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return fallback
    if isinstance(value, str) and not value.strip():
        return fallback
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if math.isfinite(parsed) else fallback


def visual_adjust_filter(clip: dict) -> str:
    """Translate Studio visualAdjustments into an FFmpeg filter chain.

    render_mp4.py consumes this helper while building visual clips. Keeping the
    normalization strict mirrors the browser engine: malformed imported values fall
    back to neutral adjustments instead of crashing a render or changing the image.
    """
    raw = clip.get('visualAdjustments') if isinstance(clip, dict) else None
    if not isinstance(raw, dict):
        return ''
    brightness = max(0.0, min(300.0, _finite(raw.get('brightness'), 100.0)))
    contrast = max(0.0, min(300.0, _finite(raw.get('contrast'), 100.0)))
    saturation = max(0.0, min(300.0, _finite(raw.get('saturation'), 100.0)))
    grayscale = max(0.0, min(100.0, _finite(raw.get('grayscale'), 0.0)))
    if brightness == 100 and contrast == 100 and saturation == 100 and grayscale == 0:
        return ''
    # Canvas brightness() is multiplicative; FFmpeg eq brightness is additive.
    # Use exposure-like gain for brightness and fold grayscale into saturation.
    sat = (saturation / 100.0) * (1.0 - grayscale / 100.0)
    return f'eq=contrast={contrast/100.0:.4f}:saturation={sat:.4f},colorlevels=rimax={brightness/100.0:.4f}:gimax={brightness/100.0:.4f}:bimax={brightness/100.0:.4f}'


# Compatibility bridge for render_mp4.py, whose visual chain resolves this helper
# through Python builtins. This keeps the current renderer operational without any
# paid dependency while the render modules remain standalone CLI scripts.
builtins.visual_adjust_filter = visual_adjust_filter


def _glyph_units(ch: str) -> float:
    if ch.isspace():
        return 0.30
    if ch in "ilI1|!.,:;'`":
        return 0.30
    if ch in "mwMW@%&#QO0":
        return 0.88
    if ch.isupper():
        return 0.66
    if ch.isdigit():
        return 0.60
    return 0.56


def estimate_width(text: str, font_size: float) -> float:
    return sum(_glyph_units(ch) for ch in str(text)) * float(font_size)


def _hard_parts(word: str, max_width: float, font_size: float) -> list[str]:
    parts: list[str] = []
    part = ""
    for ch in word:
        candidate = part + ch
        if part and estimate_width(candidate, font_size) > max_width:
            parts.append(part)
            part = ch
        else:
            part = candidate
    if part:
        parts.append(part)
    return parts


def _wrap(text: str, max_width: float, font_size: float) -> list[str]:
    words: list[str] = []
    for word in str(text or "").strip().split():
        if estimate_width(word, font_size) <= max_width:
            words.append(word)
        else:
            words.extend(_hard_parts(word, max_width, font_size))

    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}" if line else word
        if line and estimate_width(candidate, font_size) > max_width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def layout_caption(
    text: str,
    base_size: float,
    frame_width: int = 1080,
    max_width_ratio: float = 0.88,
    max_lines: int = 3,
    min_scale: float = 0.62,
) -> dict:
    """Return a render-safe font size and wrapped lines.

    Font size shrinks in 4px output-space increments, matching the preview's 2px
    steps on its 540px canvas. If text is still longer than three lines at the
    minimum size, the final line receives an ellipsis instead of overflowing.
    """
    raw = " ".join(str(text or "").strip().split())
    if not raw:
        return {"size": float(base_size), "lines": [], "line_height": int(round(base_size * 1.16))}

    max_width = max(1.0, float(frame_width) * float(max_width_ratio))
    base = max(1.0, float(base_size))
    minimum = max(36.0, round(base * float(min_scale)))
    size = base
    chosen = None
    while size >= minimum - 0.001:
        lines = _wrap(raw, max_width, size)
        if len(lines) <= max_lines:
            chosen = lines
            break
        size -= 4.0

    if chosen is None:
        size = minimum
        lines = _wrap(raw, max_width, size)
        chosen = lines[:max_lines]
        if len(lines) > max_lines and chosen:
            last = chosen[-1]
            ellipsis = "…"
            while last and estimate_width(last + ellipsis, size) > max_width:
                last = last[:-1].rstrip()
            chosen[-1] = (last + ellipsis) if last else ellipsis

    return {
        "size": float(size),
        "lines": chosen,
        "line_height": int(round(float(size) * 1.16)),
        "max_width": max_width,
    }
