#!/usr/bin/env python3
"""Reject active timeline clips that would be silently truncated by MP4 export."""
import json
import math
import pathlib
import sys

from track_state_render import normalize_track_solo

TOLERANCE = 0.05


def finite(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def inspect(project):
    project = normalize_track_solo(project, normalize_scalars=False)
    duration = finite(project.get('duration'))
    if duration is None or duration <= 0:
        return []  # validate_project.py reports the malformed project duration.

    state = project.get('trackState') if isinstance(project.get('trackState'), dict) else {}

    def track_state(track):
        value = state.get(str(track), state.get(track, {}))
        return value if isinstance(value, dict) else {}

    issues = []
    for index, clip in enumerate(project.get('clips', []) or []):
        if not isinstance(clip, dict):
            continue
        track = finite(clip.get('track'))
        if track is None or not track.is_integer():
            continue
        track = int(track)
        ts = track_state(track)
        inactive = (track in (0, 1, 2, 3) and ts.get('hidden') is True) or (track in (4, 5, 6) and ts.get('muted') is True)
        if inactive:
            continue
        start = finite(clip.get('start'))
        length = finite(clip.get('duration'))
        if start is None or length is None or start < 0 or length <= 0:
            continue  # structural validator owns malformed scalar errors.
        end = start + length
        if start >= duration - 1e-9:
            issues.append(f'Clip {clip.get("id", index)!r} empieza en {start:.3f}s, fuera de la duración del proyecto ({duration:.3f}s).')
        elif end > duration + TOLERANCE:
            issues.append(f'Clip {clip.get("id", index)!r} termina en {end:.3f}s y excede la duración del proyecto ({duration:.3f}s); el MP4 lo recortaría.')
    return issues


def main(path):
    project = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    issues = inspect(project)
    if issues:
        print('Timeline bounds preflight FAILED', file=sys.stderr)
        for issue in issues:
            print(f'- {issue}', file=sys.stderr)
        return 2
    print('Timeline bounds preflight OK')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: timeline_bounds_preflight.py project.json')
    raise SystemExit(main(sys.argv[1]))
