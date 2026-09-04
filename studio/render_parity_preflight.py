#!/usr/bin/env python3
"""Fail early when a Studio project uses visual settings the $0 FFmpeg renderer
cannot reproduce deterministically.

The browser editor may receive older/imported JSON with arbitrary enum or numeric
values. Silently falling back or clamping during MP4 export makes the final video
differ from preview, so this check runs before expensive composition and reports
the exact clips to fix.
"""
import json
import math
import pathlib
import sys

from track_state_render import _canonical_track

ALLOWED_TRANSITIONS = {'cut', 'fade', 'zoom', 'slide'}
ALLOWED_FIT_MODES = {'cover', 'contain'}
ALLOWED_TEXT_STYLES = {'title', 'label', 'callout'}
ALLOWED_TEXT_ANIMATIONS = {'none', 'fade', 'pop', 'slide-up'}
ALLOWED_FPS = {24, 30, 60}
MIN_SPEED = 0.25
MAX_SPEED = 4.0
MIN_TRANSITION_DURATION = 0.05
MAX_TRANSITION_DURATION = 2.0


def _finite(value):
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return math.nan


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
        # The FFmpeg render path canonicalizes legacy numeric aliases such as
        # "01", "1.0" and "02" before composition. Parity checks must classify
        # those clips identically or unsupported visual/text settings can bypass
        # preflight and then be silently rendered with a fallback behavior.
        track = _canonical_track(clip.get('track', -1))

        if track in (0, 1):
            transition = str(clip.get('transition', 'cut') or 'cut')
            if transition not in ALLOWED_TRANSITIONS:
                issues.append(f'Clip "{name}" ({clip_id}): transición "{transition}" no reproducible en MP4.')
            fit_mode = str(clip.get('fitMode', 'cover') or 'cover')
            if fit_mode not in ALLOWED_FIT_MODES:
                issues.append(f'Clip "{name}" ({clip_id}): ajuste "{fit_mode}" no reproducible en MP4.')
            if clip.get('transitionDuration') is not None:
                value = clip.get('transitionDuration')
                duration = _number(clip.get('duration', 0))
                upper = min(MAX_TRANSITION_DURATION, duration) if math.isfinite(duration) and duration > 0 else MAX_TRANSITION_DURATION
                if (not _finite(value) or float(value) < MIN_TRANSITION_DURATION or float(value) > upper + 1e-9):
                    issues.append(
                        f'Clip "{name}" ({clip_id}): duración de transición inválida ({value!r}); '
                        f'usa {MIN_TRANSITION_DURATION:.2f}–{upper:.2f} s.'
                    )

        numeric_fields = ('start', 'duration', 'sourceOffset', 'speed')
        invalid_numeric = set()
        for field in numeric_fields:
            if field in clip and clip.get(field) is not None and not _finite(clip.get(field)):
                issues.append(f'Clip "{name}" ({clip_id}): {field} no es un número válido.')
                invalid_numeric.add(field)

        # Match the ranges enforced by the Studio inspector and consumed by the
        # local renderer. Imported/recovered JSON must never be silently clamped
        # during MP4 export because that would produce a different edit than preview.
        if 'start' in clip and clip.get('start') is not None and 'start' not in invalid_numeric:
            if float(clip.get('start')) < 0:
                issues.append(f'Clip "{name}" ({clip_id}): start no puede ser negativo.')
        if 'duration' in clip and clip.get('duration') is not None and 'duration' not in invalid_numeric:
            if float(clip.get('duration')) <= 0:
                issues.append(f'Clip "{name}" ({clip_id}): duration debe ser mayor que 0.')
        if 'sourceOffset' in clip and clip.get('sourceOffset') is not None and 'sourceOffset' not in invalid_numeric:
            if float(clip.get('sourceOffset')) < 0:
                issues.append(f'Clip "{name}" ({clip_id}): sourceOffset no puede ser negativo.')
        if 'speed' in clip and clip.get('speed') is not None and 'speed' not in invalid_numeric:
            speed = float(clip.get('speed'))
            if speed < MIN_SPEED or speed > MAX_SPEED:
                issues.append(
                    f'Clip "{name}" ({clip_id}): velocidad {speed:g}× fuera de rango; '
                    f'usa {MIN_SPEED:g}×–{MAX_SPEED:g}×.'
                )

        if track == 2:
            style = str(clip.get('textStyle', 'title') or 'title')
            animation = str(clip.get('textAnimation', 'pop') or 'pop')
            if style not in ALLOWED_TEXT_STYLES:
                issues.append(f'Título "{name}" ({clip_id}): estilo "{style}" no reproducible en MP4.')
            if animation not in ALLOWED_TEXT_ANIMATIONS:
                issues.append(f'Título "{name}" ({clip_id}): animación "{animation}" no reproducible en MP4.')

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
