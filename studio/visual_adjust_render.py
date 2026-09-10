#!/usr/bin/env python3
"""FFmpeg parity helpers for ProfitMente Studio visual adjustments.

The browser stores brightness/contrast/saturation as percentages where 100 is
neutral and grayscale as a percentage where 0 is neutral. Keep this helper
small and dependency-free so MP4 rendering remains fully local/$0.
"""

from visual_crop_render import visual_crop_filter


def _finite(value, fallback):
    if isinstance(value, bool):
        return fallback
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    if number != number or number in (float('inf'), float('-inf')):
        return fallback
    return number


def _clamp(value, low, high, fallback):
    return max(low, min(high, _finite(value, fallback)))


def normalize_visual_adjustments(clip):
    raw = clip.get('visualAdjustments') if isinstance(clip, dict) else None
    raw = raw if isinstance(raw, dict) else {}
    return {
        'brightness': _clamp(raw.get('brightness'), 0.0, 300.0, 100.0),
        'contrast': _clamp(raw.get('contrast'), 0.0, 300.0, 100.0),
        'saturation': _clamp(raw.get('saturation'), 0.0, 300.0, 100.0),
        'grayscale': _clamp(raw.get('grayscale'), 0.0, 100.0, 0.0),
    }


def visual_adjust_filter(clip):
    """Return the local FFmpeg visual filter chain used by MP4 rendering.

    Crop is included here because render_mp4.py already routes every visual
    clip through this helper. This keeps preview/MP4 parity without a second
    render path. Brightness is multiplicative (matching CSS brightness), while
    contrast/saturation use FFmpeg eq. Grayscale collapses into saturation.
    """
    filters = []
    crop = visual_crop_filter(clip)
    if crop:
        filters.append(crop)

    state = normalize_visual_adjustments(clip)
    brightness = state['brightness'] / 100.0
    contrast = state['contrast'] / 100.0
    saturation = (state['saturation'] / 100.0) * (1.0 - state['grayscale'] / 100.0)

    if abs(brightness - 1.0) >= 1e-9:
        filters.append(
            f"colorchannelmixer=rr={brightness:.6f}:gg={brightness:.6f}:bb={brightness:.6f}"
        )
    if abs(contrast - 1.0) >= 1e-9 or abs(saturation - 1.0) >= 1e-9:
        filters.append(f"eq=contrast={contrast:.6f}:saturation={saturation:.6f}")
    return ','.join(filters)
