#!/usr/bin/env python3
"""Safe sizing for single-word timed captions in the local $0 renderer.

The browser preview measures text with Canvas. FFmpeg drawtext cannot expose text
width before the filter is built, so this module uses the same conservative glyph
model as caption_layout.py and returns a maximum font size that keeps the word and
its background padding inside the 88% caption-safe width.
"""
from __future__ import annotations

from caption_layout import estimate_width


def fit_word_caption(
    text: str,
    base_size: float = 78.0,
    frame_width: int = 1080,
    safe_ratio: float = 0.88,
    horizontal_padding: float = 52.0,
    peak_pop: float = 1.16,
) -> dict:
    """Return a safe maximum fontsize for a timed word caption.

    ``size_cap`` is the maximum instantaneous fontsize, not the resting size. The
    renderer can therefore keep its pop animation with ``min(base*pop, size_cap)``
    while guaranteeing the estimated text width plus box padding stays in bounds.
    No artificial readability floor is imposed: for pathological unbroken words,
    staying on-screen is safer than clipping the exported MP4.
    """
    raw = str(text or '').strip().upper()
    safe_width = max(1.0, float(frame_width) * float(safe_ratio))
    text_width = max(1.0, safe_width - max(0.0, float(horizontal_padding)))
    base = max(1.0, float(base_size))
    peak = max(1.0, float(peak_pop))
    natural_peak = base * peak
    units_at_one = max(0.001, estimate_width(raw, 1.0))
    safe_cap = text_width / units_at_one
    size_cap = max(1.0, min(natural_peak, safe_cap))
    resting_size = min(base, size_cap)
    box_padding = min(float(horizontal_padding) / 2.0, max(8.0, resting_size * 0.34))
    border = max(2.0, min(7.0, resting_size * 0.09))
    return {
        'text': raw,
        'size_cap': float(size_cap),
        'resting_size': float(resting_size),
        'safe_width': float(safe_width),
        'text_width': float(text_width),
        'box_padding': float(box_padding),
        'border': float(border),
    }
