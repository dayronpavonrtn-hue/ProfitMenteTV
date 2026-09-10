"""Translate Studio visualKeyframes into FFmpeg renderer clip segments.

The browser keyframe engine supports any number of keyframes and easing modes.
render_mp4.py renders linear start/end keyframes, so this adapter splits a
render-only copy at keyframe boundaries and adds small local segments for curved
easing. The saved project and separate audio mix remain unchanged.
"""
import copy
import math

DEFAULT_STATE = {"x": 0.0, "y": 0.0, "scale": 1.0, "rotation": 0.0, "opacity": 1.0}
EASINGS = {"linear", "ease-in", "ease-out", "ease-in-out", "hold"}
TOLERANCE = 0.001
EASING_STEPS = 12


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


def _canonical_track(value):
    number = _finite(value)
    if number is None or not float(number).is_integer():
        return None
    track = int(number)
    return track if 0 <= track <= 6 else None


def _canonical_easing(value):
    easing = value.strip().lower() if isinstance(value, str) else ""
    return easing if easing in EASINGS else "linear"


def _clamp(value, low, high):
    return max(low, min(high, value))


def _ease(easing, progress):
    p = _clamp(_finite(progress, 0.0), 0.0, 1.0)
    easing = _canonical_easing(easing)
    if easing == "ease-in":
        return p * p
    if easing == "ease-out":
        return 1.0 - (1.0 - p) * (1.0 - p)
    if easing == "ease-in-out":
        return 2.0 * p * p if p < 0.5 else 1.0 - ((-2.0 * p + 2.0) ** 2) / 2.0
    if easing == "hold":
        return 1.0 if p >= 1.0 else 0.0
    return p


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
        frames.append({
            "time": round(_clamp(time, 0.0, duration), 6),
            **_state(frame),
            "easing": _canonical_easing(frame.get("easing")),
        })
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


def _interval(frames, local_time):
    if len(frames) < 2:
        return None, None
    t = _finite(local_time, 0.0)
    for index in range(1, len(frames)):
        if frames[index - 1]["time"] - TOLERANCE <= t <= frames[index]["time"] + TOLERANCE:
            return frames[index - 1], frames[index]
    return None, None


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
    raw = _clamp((t - left["time"]) / span, 0.0, 1.0)
    return _mix(_state(left), _state(right), _ease(left.get("easing"), raw))


def _legacy_state(state):
    return {
        "positionX": state["x"],
        "positionY": state["y"],
        "scale": state["scale"],
        "rotation": state["rotation"],
        "opacity": state["opacity"],
    }


def _render_boundaries(frames, duration):
    boundaries = {0.0, round(duration, 6)}
    for frame in frames:
        if TOLERANCE < frame["time"] < duration - TOLERANCE:
            boundaries.add(round(frame["time"], 6))
    for left, right in zip(frames, frames[1:]):
        if _canonical_easing(left.get("easing")) in {"ease-in", "ease-out", "ease-in-out"}:
            span = right["time"] - left["time"]
            if span > TOLERANCE:
                for step in range(1, EASING_STEPS):
                    boundaries.add(round(left["time"] + span * step / EASING_STEPS, 6))
    return sorted(boundaries)


def _segment_end_state(frames, duration, left_time, right_time):
    left_frame, right_frame = _interval(frames, (left_time + right_time) / 2.0)
    if left_frame is not None and _canonical_easing(left_frame.get("easing")) == "hold" and right_time <= right_frame["time"] + TOLERANCE:
        return _state(left_frame)
    return state_at(frames, duration, right_time)


def expand_visual_keyframes(project):
    """Return a render-only project segmented for browser/MP4 motion parity."""
    result = copy.deepcopy(project)
    expanded = []
    for clip in result.get("clips", []) or []:
        if not isinstance(clip, dict) or _canonical_track(clip.get("track")) not in (0, 1):
            expanded.append(clip)
            continue
        frames = normalize_visual_keyframes(clip)
        if not frames:
            expanded.append(clip)
            continue
        duration = max(0.001, _finite(clip.get("duration"), 0.001))
        boundaries = _render_boundaries(frames, duration)
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
                "end": _legacy_state(_segment_end_state(frames, duration, left, right)),
            }
            segment.pop("visualKeyframes", None)
            if index > 0:
                segment["transition"] = "cut"
                segment.pop("transitionDuration", None)
            expanded.append(segment)
    result["clips"] = expanded
    return result
