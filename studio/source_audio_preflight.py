"""Validate source-audio controls used by visual clips before render.

Dependency-free so Studio UI, generator and render gates can share one rule.
"""
import argparse
import json
import math
from pathlib import Path

VISUAL_SOURCE_AUDIO_TRACKS = {0, 1}
MIN_SOURCE_VOLUME = 0.0
MAX_SOURCE_VOLUME = 2.0


def _track_index(value):
    if value is None or isinstance(value, bool): return None
    try: number = float(value)
    except (TypeError, ValueError): return None
    if not math.isfinite(number) or not number.is_integer(): return None
    return int(number)


def _finite_number(value):
    if value is None or isinstance(value, bool): return None
    try: number = float(value)
    except (TypeError, ValueError): return None
    return number if math.isfinite(number) else None


def inspect(project):
    """Return human-readable issues for invalid visual source-audio gain values."""
    if not isinstance(project, dict): return ['Proyecto inválido.']
    clips = project.get('clips')
    if not isinstance(clips, list): return []
    issues = []
    for index, clip in enumerate(clips):
        if not isinstance(clip, dict): continue
        if _track_index(clip.get('track')) not in VISUAL_SOURCE_AUDIO_TRACKS: continue
        if 'sourceVolume' not in clip: continue
        value = _finite_number(clip.get('sourceVolume'))
        if value is None or not MIN_SOURCE_VOLUME <= value <= MAX_SOURCE_VOLUME:
            clip_id = clip.get('id', clip.get('name', index))
            issues.append(f'Clip {clip_id!r}: sourceVolume debe ser un número finito entre {MIN_SOURCE_VOLUME:.1f} y {MAX_SOURCE_VOLUME:.1f}.')
    return issues


def validate(project):
    issues = inspect(project)
    if issues: raise ValueError('Audio fuente inválido: ' + ' | '.join(issues))
    return True


def main():
    parser = argparse.ArgumentParser(description='Preflight local del audio fuente de clips visuales de ProfitMente Studio.')
    parser.add_argument('project', help='Proyecto JSON exportado por Studio')
    args = parser.parse_args()
    try:
        project = json.loads(Path(args.project).read_text(encoding='utf-8'))
        validate(project)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        print(f'ERROR: {exc}')
        raise SystemExit(2)
    print('SOURCE AUDIO PREFLIGHT OK')


if __name__ == '__main__':
    main()
