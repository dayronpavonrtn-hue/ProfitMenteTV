#!/usr/bin/env python3
"""Local FFmpeg crop helper for ProfitMente Studio."""

import math


def _number(value, fallback=0.0):
    """Accept only finite JSON scalar numbers/numeric strings.

    Keep MP4 crop parsing aligned with Studio preview/QA semantics: booleans,
    arrays, objects, empty strings, NaN and infinities must not become crop
    percentages through Python coercion.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return fallback
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return fallback
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def normalize_visual_crop(clip):
    raw = clip.get('visualCrop') if isinstance(clip, dict) else None
    raw = raw if isinstance(raw, dict) else {}
    vals = {
        k: max(0.0, min(95.0, _number(raw.get(k), 0.0)))
        for k in ('left', 'right', 'top', 'bottom')
    }
    hs = vals['left'] + vals['right']
    if hs > 95.0:
        scale = 95.0 / hs
        vals['left'] *= scale
        vals['right'] *= scale
    vs = vals['top'] + vals['bottom']
    if vs > 95.0:
        scale = 95.0 / vs
        vals['top'] *= scale
        vals['bottom'] *= scale
    return vals


def visual_crop_filter(clip):
    """Return a transparent crop+pad chain matching the browser preview.

    Browser crop is non-destructive: a one-sided crop leaves transparent space
    on that same side instead of zooming or recentring the remaining pixels.
    Crop first, then pad back to the original frame geometry so MP4 overlays
    preserve the same asymmetric placement.
    """
    s = normalize_visual_crop(clip)
    if not any(s.values()):
        return ''

    left = s['left'] / 100.0
    top = s['top'] / 100.0
    wf = max(0.05, 1.0 - (s['left'] + s['right']) / 100.0)
    hf = max(0.05, 1.0 - (s['top'] + s['bottom']) / 100.0)
    pad_x = left / wf
    pad_y = top / hf
    return (
        f"crop=iw*{wf:.8f}:ih*{hf:.8f}:iw*{left:.8f}:ih*{top:.8f},"
        f"pad=iw/{wf:.8f}:ih/{hf:.8f}:iw*{pad_x:.8f}:ih*{pad_y:.8f}:color=black@0"
    )
