#!/usr/bin/env python3
"""Fail early when a Studio project uses visual settings the $0 FFmpeg renderer
cannot reproduce deterministically.

The browser editor may receive older/imported JSON with arbitrary enum values.
Silently falling back during MP4 export makes the final video differ from preview,
so this check runs before expensive composition and reports the exact clips to fix.
"""
import json
import math
import pathlib
import sys

ALLOWED_TRANSITIONS = {'cut', 'fade', 'zoom', 'slide'}
ALLOWED_FIT_MODES = {'cover', 'contain'}
ALLOWED_TEXT_STYLES = {'title', 'label', 'callout'}
ALLOWED_TEXT_ANIMATIONS = {'none', 'fade', 'pop', 'slide-up'}
ALLOWED_FPS = {24, 30, 60}


def _finite(value):
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def inspect(project):
    issues = []
    try:
        fps = int(round(float(project.get('fps', 30) or 30)))
    except (TypeError, ValueError):
        fps = -1
    if fps not in ALLOWED_FPS:
        issues.append(f'FPS {project.get("fps")!r} no soportado por exportación MP4; usa 24, 30 o 60.')

    for index, clip in enumerate(project.get('clips', []) or []):
        if not isinstance(clip, dict):
            continue
        clip_id = str(clip.get('id') or f'#{index + 1}')
        name = str(clip.get('name') or clip_id)
        try:
            track = int(clip.get('track', -1))
        except (TypeError, ValueError):
            track = -1

        if track in (0, 1):
            transition = str(clip.get('transition', 'cut') or 'cut')
            if transition not in ALLOWED_TRANSITIONS:
                issues.append(f'Clip "{name}" ({clip_id}): transición "{transition}" no reproducible en MP4.')
            fit_mode = str(clip.get('fitMode', 'cover') or 'cover')
            if fit_mode not in ALLOWED_FIT_MODES:
                issues.append(f'Clip "{name}" ({clip_id}): ajuste "{fit_mode}" no reproducible en MP4.')
            if clip.get('transitionDuration') is not None:
                value = clip.get('transitionDuration')
                if not _finite(value) or float(value) <= 0:
                    issues.append(f'Clip "{name}" ({clip_id}): duración de transición inválida ({value!r}).')

        if track == 2:
            style = str(clip.get('textStyle', 'title') or 'title')
            animation = str(clip.get('textAnimation', 'pop') or 'pop')
            if style not in ALLOWED_TEXT_STYLES:
                issues.append(f'Título "{name}" ({clip_id}): estilo "{style}" no reproducible en MP4.')
            if animation not in ALLOWED_TEXT_ANIMATIONS:
                issues.append(f'Título "{name}" ({clip_id}): animación "{animation}" no reproducible en MP4.')

        for field in ('start', 'duration', 'sourceOffset', 'speed'):
            if field in clip and clip.get(field) is not None and not _finite(clip.get(field)):
                issues.append(f'Clip "{name}" ({clip_id}): {field} no es un número válido.')

    return issues


def main(path):
    project = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    issues = inspect(project)
    if issues:
        print('Render parity preflight FAILED', file=sys.stderr)
        for issue in issues:
            print(f'- {issue}', file=sys.stderr)
        return 2
    print('Render parity preflight OK')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: render_parity_preflight.py project.json')
    raise SystemExit(main(sys.argv[1]))
