#!/usr/bin/env python3
"""Reject obviously corrupt/accidental render workloads before FFmpeg starts.

ProfitMente Studio is primarily a short-form editor. A malformed imported project
must not be able to request hours/days of 1080p rendering and exhaust local disk,
CPU or battery. The ceiling is intentionally generous for legitimate long edits.
"""
import json
import math
import pathlib
import sys

from track_state_render import normalize_track_solo

MAX_RENDER_SECONDS = 6 * 60 * 60
MAX_ACTIVE_CLIPS = 10000


def finite_number(value):
    if isinstance(value, bool) or value is None or not isinstance(value, (int, float, str)):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def effective_clip_count(project):
    """Count only clips that can actually contribute to the MP4 composition."""
    project = normalize_track_solo(project, normalize_scalars=False)
    state = project.get('trackState') if isinstance(project.get('trackState'), dict) else {}

    def track_state(track):
        value = state.get(str(track), state.get(track, {}))
        return value if isinstance(value, dict) else {}

    active = 0
    for clip in project.get('clips', []):
        if not isinstance(clip, dict) or clip.get('disabled') is True:
            continue
        track_value = finite_number(clip.get('track'))
        # Structural/timeline preflights own malformed-track diagnostics. Count an
        # unparseable clip conservatively so the budget guard cannot be bypassed.
        if track_value is None or not track_value.is_integer() or int(track_value) not in range(7):
            active += 1
            continue
        track = int(track_value)
        ts = track_state(track)
        if track in (0, 1, 2, 3) and ts.get('hidden') is True:
            continue
        if track in (4, 5, 6) and (ts.get('muted') is True or clip.get('muted') is True):
            continue
        active += 1
    return active


def main(path):
    project = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    duration = finite_number(project.get('duration'))
    if duration is None or duration <= 0:
        raise SystemExit('Render bloqueado: duración de proyecto inválida')
    if duration > MAX_RENDER_SECONDS:
        raise SystemExit(
            f'Render bloqueado: duración {duration:.2f}s supera el límite local seguro '
            f'de {MAX_RENDER_SECONDS}s'
        )
    clips = project.get('clips')
    if not isinstance(clips, list):
        raise SystemExit('Render bloqueado: clips debe ser una lista')
    active = effective_clip_count(project)
    if active > MAX_ACTIVE_CLIPS:
        raise SystemExit(
            f'Render bloqueado: {active} clips activos superan el límite local seguro '
            f'de {MAX_ACTIVE_CLIPS}'
        )
    print(json.dumps({'ok': True, 'duration': duration, 'activeClips': active}, indent=2))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: render_budget_preflight.py project.json')
    main(sys.argv[1])
