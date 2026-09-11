"""Caption timing normalization shared by the zero-cost FFmpeg renderer.

Studio projects historically used absolute timeline word timings, while imported or
hand-authored projects may contain clip-relative timings and may provide either
``end`` or ``duration``. Keep this parsing outside render_mp4.py so it is easy to
regression-test without invoking FFmpeg.
"""
from __future__ import annotations

from copy import deepcopy
import math


def _number(value):
    """Return a finite float without accepting booleans or coercible objects."""
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def normalize_word_timings(clip, clip_start, clip_end):
    """Return safe ``(word, start, end)`` tuples in absolute timeline seconds."""
    if not isinstance(clip, dict):
        return []
    start = _number(clip_start)
    end = _number(clip_end)
    if start is None or end is None or end <= start:
        return []
    timings = clip.get("wordTimings")
    if not isinstance(timings, list):
        return []

    clip_duration = end - start
    mode = clip.get("wordTimingMode")
    mode = mode.strip().lower() if isinstance(mode, str) else ""
    if mode not in ("relative", "absolute"):
        mode = ""

    normalized = []
    for timing in timings:
        if not isinstance(timing, dict):
            continue
        raw_word = timing.get("word", timing.get("text", ""))
        if not isinstance(raw_word, str):
            continue
        word = raw_word.strip()
        if not word:
            continue

        word_start = _number(timing.get("start"))
        word_end = _number(timing.get("end"))
        word_duration = _number(timing.get("duration"))
        if word_start is None:
            continue
        if word_end is None and word_duration is not None and word_duration > 0:
            word_end = word_start + word_duration
        if word_end is None or word_end <= word_start:
            continue

        relative = mode == "relative" or timing.get("relative") is True
        if not mode and not relative:
            relative = (
                start > 1e-6
                and word_start >= -1e-6
                and word_end <= clip_duration + 1e-6
                and word_start < start - 1e-6
            )
        if relative:
            word_start += start
            word_end += start

        word_start = max(start, word_start)
        word_end = min(end, word_end)
        if word_end - word_start <= 1e-6:
            continue
        normalized.append((word, word_start, word_end))

    normalized.sort(key=lambda item: (item[1], item[2], item[0]))
    return normalized


def normalize_project_caption_timings(project):
    """Return a render-only project with canonical absolute word timings."""
    result = deepcopy(project) if isinstance(project, dict) else {}
    clips = result.get("clips") if isinstance(result.get("clips"), list) else []
    for clip in clips:
        if not isinstance(clip, dict):
            continue
        track = clip.get("track")
        if track not in (3, "3") or "wordTimings" not in clip:
            continue
        start = _number(clip.get("start"))
        duration = _number(clip.get("duration"))
        if start is None or duration is None or duration <= 0:
            clip["wordTimings"] = []
            continue
        end = start + duration
        normalized = normalize_word_timings(clip, start, end)
        clip["wordTimings"] = [
            {
                "word": word,
                "start": round(word_start, 6),
                "end": round(word_end, 6),
                "duration": round(word_end - word_start, 6),
            }
            for word, word_start, word_end in normalized
        ]
        clip["wordTimingMode"] = "absolute"
    return result
