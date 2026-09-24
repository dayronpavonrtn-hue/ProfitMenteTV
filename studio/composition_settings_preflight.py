#!/usr/bin/env python3
"""Reject ambiguous persisted composition settings before local MP4 render."""
import json
import math
import pathlib
import sys

VALID_FORMATS = {'9:16', '16:9', '1:1'}
VALID_FPS = {24, 30, 60}
VALID_QUALITY = {'draft', 'standard', 'high'}


def _number(value):
    if isinstance(value, bool) or value is None or not isinstance(value, (int, float, str)):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def inspect(project):
    if not isinstance(project, dict):
        return ['El proyecto debe ser un objeto JSON.']
    issues = []
    fmt = project.get('format', '9:16')
    if not isinstance(fmt, str) or fmt not in VALID_FORMATS:
        issues.append(f'Formato de proyecto inválido {fmt!r}; usa 9:16, 16:9 o 1:1.')

    fps = _number(project.get('fps', 30))
    if fps is None or not fps.is_integer() or int(fps) not in VALID_FPS:
        issues.append(f'FPS inválido {project.get("fps")!r}; usa 24, 30 o 60.')

    # Duration drives preview bounds, timeline percentages and the FFmpeg render
    # window. Imported/recovered projects must not reach render with NaN, infinity,
    # booleans, zero or negative values: those can create empty output, invalid
    # filter arguments or a render that disagrees with the editor.
    duration = _number(project.get('duration', 45))
    if duration is None or duration <= 0:
        issues.append(f'Duración de proyecto inválida {project.get("duration")!r}; usa un valor mayor que 0 segundos.')

    quality = project.get('renderQuality', 'high')
    if not isinstance(quality, str) or quality not in VALID_QUALITY:
        issues.append(f'Calidad de render inválida {quality!r}; usa draft, standard o high.')

    # Every downstream editor/render stage treats clips as an ordered timeline.
    # Reject malformed imported/recovered values here instead of allowing a dict,
    # string or scalar to be iterated/coerced differently by later components.
    clips = project.get('clips', [])
    if not isinstance(clips, list):
        issues.append('La colección clips debe ser una lista válida.')
    else:
        for index, clip in enumerate(clips):
            if not isinstance(clip, dict):
                issues.append(f'Clip #{index + 1} debe ser un objeto válido.')
                continue

            # Timing is optional for legacy/generated clip shapes, but when persisted
            # it must be unambiguous. Do not let NaN/Infinity/booleans/negative starts
            # or non-positive durations reach preview and FFmpeg with different coercion.
            if 'start' in clip:
                start = _number(clip.get('start'))
                if start is None or start < 0:
                    issues.append(f'Clip #{index + 1} tiene inicio inválido {clip.get("start")!r}; usa 0 o más segundos.')
            if 'duration' in clip:
                clip_duration = _number(clip.get('duration'))
                if clip_duration is None or clip_duration <= 0:
                    issues.append(f'Clip #{index + 1} tiene duración inválida {clip.get("duration")!r}; usa un valor mayor que 0 segundos.')
    return issues


def main(path):
    try:
        project = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        print(f'Composition settings preflight FAILED: {exc}', file=sys.stderr)
        return 2
    issues = inspect(project)
    if issues:
        print('Composition settings preflight FAILED', file=sys.stderr)
        for issue in issues:
            print(f'- {issue}', file=sys.stderr)
        return 2
    print('Composition settings preflight OK')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: composition_settings_preflight.py project.json')
    raise SystemExit(main(sys.argv[1]))
