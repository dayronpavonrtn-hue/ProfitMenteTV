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
    active = sum(1 for clip in clips if isinstance(clip, dict) and clip.get('disabled') is not True)
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
