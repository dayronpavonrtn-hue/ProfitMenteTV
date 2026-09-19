#!/usr/bin/env python3
"""Reject active timeline clips that would be silently truncated or misread by MP4 export."""
import json
import math
import pathlib
import sys

try:
    from .track_state_render import normalize_track_solo
except ImportError:  # direct script execution from studio/
    from track_state_render import normalize_track_solo

TOLERANCE = 0.05


def finite(value):
    if isinstance(value, bool) or value is None or not isinstance(value, (int, float, str)):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def canonical_id(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    number = finite(value)
    if number is None:
        return None
    return str(int(number)) if number.is_integer() else str(number)


def inspect(project):
    project = normalize_track_solo(project, normalize_scalars=False)
    duration = finite(project.get('duration'))
    if duration is None or duration <= 0:
        return ['La duración del proyecto es inválida; el render no puede interpretar la timeline de forma segura.']

    state = project.get('trackState') if isinstance(project.get('trackState'), dict) else {}
    assets = project.get('assets') if isinstance(project.get('assets'), list) else []
    asset_lookup = {
        canonical_id(asset.get('id')): asset
        for asset in assets
        if isinstance(asset, dict) and canonical_id(asset.get('id')) is not None
    }

    def track_state(track):
        value = state.get(str(track), state.get(track, {}))
        return value if isinstance(value, dict) else {}

    issues = []
    for index, clip in enumerate(project.get('clips', []) or []):
        if not isinstance(clip, dict):
            continue
        clip_id = clip.get('id', index)
        track = finite(clip.get('track'))
        if track is None or not track.is_integer() or int(track) not in range(7):
            issues.append(f'Clip {clip_id!r} tiene una pista inválida; el render no puede ubicarlo de forma segura.')
            continue
        track = int(track)
        ts = track_state(track)
        inactive = (
            (track in (0, 1, 2, 3) and ts.get('hidden') is True)
            or (track in (4, 5, 6) and (ts.get('muted') is True or clip.get('muted') is True))
        )
        if inactive:
            continue
        start = finite(clip.get('start'))
        length = finite(clip.get('duration'))
        if start is None:
            issues.append(f'Clip {clip_id!r} tiene un inicio inválido; el render no puede posicionarlo de forma segura.')
            continue
        if length is None or length <= 0:
            issues.append(f'Clip {clip_id!r} tiene una duración inválida; el render no puede recortarlo de forma segura.')
            continue
        if start < 0:
            issues.append(f'Clip {clip_id!r} tiene un inicio negativo ({start:.3f}s).')
            continue
        end = start + length
        if start >= duration - 1e-9:
            issues.append(f'Clip {clip_id!r} empieza en {start:.3f}s, fuera de la duración del proyecto ({duration:.3f}s).')
        elif end > duration + TOLERANCE:
            issues.append(f'Clip {clip_id!r} termina en {end:.3f}s y excede la duración del proyecto ({duration:.3f}s); el MP4 lo recortaría.')

        # Temporal media must have enough source material for trim + playback speed.
        asset = asset_lookup.get(canonical_id(clip.get('asset')))
        if isinstance(asset, dict):
            kind = str(asset.get('type') or '').strip().lower()
            source_duration = finite(asset.get('duration'))
            if kind in {'video', 'audio'} and source_duration is not None and source_duration > 0:
                source_offset = finite(clip.get('sourceOffset', 0))
                speed = finite(clip.get('speed', 1))
                if source_offset is not None and source_offset >= 0 and speed is not None and speed > 0:
                    source_end = source_offset + length * speed
                    if source_end > source_duration + 1e-9:
                        issues.append(
                            f'Clip {clip_id!r}: el rango fuente termina en {source_end:.3f}s y excede la duración del medio fuente ({source_duration:.3f}s).'
                        )
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
