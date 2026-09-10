"""Translate Studio visualKeyframes into FFmpeg renderer clip segments.

The browser keyframe engine supports any number of keyframes. render_mp4.py already
renders legacy start/end keyframes accurately, so this adapter splits only the
visual render copy at keyframe boundaries and maps each interval to that proven
start/end representation. The saved project and the separate audio mix remain
unchanged.
"""
import copy
import math

DEFAULT_STATE = {"x": 0.0, "y": 0.0, "scale": 1.0, "rotation": 0.0, "opacity": 1.0}
TOLERANCE = 0.001


def _finite(value, fallback=None):
    if isinstance(value, bool) or value is None:
        return fallback
    if isinstance(value, str) and not value.strip():
        return fallback
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def _clamp(value, low, high):
    return max(low, min(high, value))


def _state(value):
    value = value if isinstance(value, dict) else {}
    return {
        "x": _clamp(_finite(value.get("x"), 0.0), -200.0, 200.0),
        "y": _clamp(_finite(value.get("y"), 0.0), -200.0, 200.0),
        "scale": _clamp(_finite(value.get("scale"), 1.0), 0.1, 8.0),
        "rotation": _clamp(_finite(value.get("rotation"), 0.0), -3600.0, 3600.0),
        "opacity": _clamp(_finite(value.get("opacity"), 1.0), 0.0, 1.0),
    }


def normalize_visual_keyframes(clip):
    duration = max(0.001, _finite(clip.get("duration"), 0.001))
    raw = clip.get("visualKeyframes")
    if not isinstance(raw, list):
        return []
    frames = []
    for frame in raw:
        if not isinstance(frame, dict):
            continue
        time = _finite(frame.get("time"))
        if time is None:
            continue
        frames.append({"time": round(_clamp(time, 0.0, duration), 6), **_state(frame)})
    frames.sort(key=lambda item: item["time"])
    deduped = []
    for frame in frames:
        if deduped and abs(deduped[-1]["time"] - frame["time"]) <= TOLERANCE:
            stable_time = deduped[-1]["time"]
            deduped[-1] = {**frame, "time": stable_time}
        else:
            deduped.append(frame)
    return deduped


def _mix(a, b, progress):
    return {key: a[key] + (b[key] - a[key]) * progress for key in DEFAULT_STATE}


def state_at(frames, duration, local_time):
    if not frames:
        return dict(DEFAULT_STATE)
    t = _clamp(_finite(local_time, 0.0), 0.0, max(0.001, duration))
    if t <= frames[0]["time"] + TOLERANCE:
        return _state(frames[0])
    if t >= frames[-1]["time"] - TOLERANCE:
        return _state(frames[-1])
    left, right = frames[0], frames[-1]
    for index in range(1, len(frames)):
        if t <= frames[index]["time"] + TOLERANCE:
            left, right = frames[index - 1], frames[index]
            break
    span = max(TOLERANCE, right["time"] - left["time"])
    progress = _clamp((t - left["time"]) / span, 0.0, 1.0)
    return _mix(_state(left), _state(right), progress)


def _legacy_state(state):
    return {
        "positionX": state["x"],
        "positionY": state["y"],
        "scale": state["scale"],
        "rotation": state["rotation"],
        "opacity": state["opacity"],
    }


def expand_visual_keyframes(project):
    """Return a render-only project where visualKeyframes are losslessly segmented."""
    result = copy.deepcopy(project)
    expanded = []
    for clip in result.get("clips", []) or []:
        if not isinstance(clip, dict) or clip.get("track") not in (0, 1):
            expanded.append(clip)
            continue
        frames = normalize_visual_keyframes(clip)
        if not frames:
            expanded.append(clip)
            continue
        duration = max(0.001, _finite(clip.get("duration"), 0.001))
        boundaries = [0.0]
        boundaries.extend(frame["time"] for frame in frames if TOLERANCE < frame["time"] < duration - TOLERANCE)
        boundaries.append(duration)
        boundaries = sorted(set(round(value, 6) for value in boundaries))
        original_start = _finite(clip.get("start"), 0.0)
        source_offset = max(0.0, _finite(clip.get("sourceOffset"), 0.0))
        speed = _clamp(_finite(clip.get("speed"), 1.0), 0.25, 4.0)
        for index, (left, right) in enumerate(zip(boundaries, boundaries[1:])):
            segment_duration = right - left
            if segment_duration <= 0:
                continue
            segment = copy.deepcopy(clip)
            segment["id"] = f'{clip.get("id", "clip")}__vk{index}'
            segment["start"] = original_start + left
            segment["duration"] = segment_duration
            segment["sourceOffset"] = source_offset + left * speed
            segment["keyframes"] = {
                "start": _legacy_state(state_at(frames, duration, left)),
                "end": _legacy_state(state_at(frames, duration, right)),
            }
            segment.pop("visualKeyframes", None)
            # Only the first segment owns the clip's entrance transition. Repeating
            # it at internal keyframe boundaries would create visible seams.
            if index > 0:
                segment["transition"] = "cut"
                segment.pop("transitionDuration", None)
            expanded.append(segment)
    result["clips"] = expanded
    return result
