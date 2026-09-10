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
ALLOWED_CAPTION_STYLES = {'dynamic', 'hook-pop'}
ALLOWED_CAPTION_ANIMATIONS = {'none', 'word-pulse', 'pop', 'word-by-word'}
ALLOWED_FPS = {24, 30, 60}
MIN_SPEED = 0.25
MAX_SPEED = 4.0
MIN_TRANSITION_DURATION = 0.05
MAX_TRANSITION_DURATION = 2.0
VISUAL_ADJUSTMENT_RANGES = {
    'brightness': (0.0, 300.0),
    'contrast': (0.0, 300.0),
    'saturation': (0.0, 300.0),
    'grayscale': (0.0, 100.0),
}
VISUAL_CROP_FIELDS = ('left', 'right', 'top', 'bottom')
MAX_VISUAL_CROP = 95.0


def _finite(value):
    # JSON booleans are numbers in Python (bool subclasses int), but they are not
    # valid timeline/edit parameters. Accepting True as 1 second or False as 0
    # silently changes the edit during MP4 export and breaks Preview -> render parity.
    if isinstance(value, bool) or value is None:
        return False
    if not isinstance(value, (int, float, str)):
        return False
    if isinstance(value, str) and not value.strip():
        return False
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _number(value):
    if not _finite(value):
        return math.nan
    return float(value)


def _validate_visual_state(clip, clip_id, name):
    """Reject visual values the render helpers would otherwise silently repair."""
    issues = []
    adjustments = clip.get('visualAdjustments')
    if adjustments is not None:
        if not isinstance(adjustments, dict):
            issues.append(f'Clip "{name}" ({clip_id}): visualAdjustments debe ser un objeto válido.')
        else:
            for field, (low, high) in VISUAL_ADJUSTMENT_RANGES.items():
                if field not in adjustments or adjustments.get(field) is None:
                    continue
                value = adjustments.get(field)
                if not _finite(value):
                    issues.append(f'Clip "{name}" ({clip_id}): visualAdjustments.{field} no es un número válido.')
                    continue
                number = float(value)
                if number < low or number > high:
                    issues.append(
                        f'Clip "{name}" ({clip_id}): visualAdjustments.{field}={number:g} fuera de rango; '
                        f'usa {low:g}–{high:g}.'
                    )

    crop = clip.get('visualCrop')
    if crop is not None:
        if not isinstance(crop, dict):
            issues.append(f'Clip "{name}" ({clip_id}): visualCrop debe ser un objeto válido.')
        else:
            values = {}
            for field in VISUAL_CROP_FIELDS:
                if field not in crop or crop.get(field) is None:
                    values[field] = 0.0
                    continue
                value = crop.get(field)
                if not _finite(value):
                    issues.append(f'Clip "{name}" ({clip_id}): visualCrop.{field} no es un número válido.')
                    values[field] = math.nan
                    continue
                number = float(value)
                values[field] = number
                if number < 0.0 or number > MAX_VISUAL_CROP:
                    issues.append(
                        f'Clip "{name}" ({clip_id}): visualCrop.{field}={number:g} fuera de rango; '
                        f'usa 0–{MAX_VISUAL_CROP:g}%.'
                    )
            horizontal = values.get('left', 0.0) + values.get('right', 0.0)
            vertical = values.get('top', 0.0) + values.get('bottom', 0.0)
            if math.isfinite(horizontal) and horizontal > MAX_VISUAL_CROP + 1e-9:
                issues.append(
                    f'Clip "{name}" ({clip_id}): recorte horizontal total {horizontal:g}% excede '
                    f'{MAX_VISUAL_CROP:g}% y sería reescalado durante el render.'
                )
            if math.isfinite(vertical) and vertical > MAX_VISUAL_CROP + 1e-9:
                issues.append(
                    f'Clip "{name}" ({clip_id}): recorte vertical total {vertical:g}% excede '
                    f'{MAX_VISUAL_CROP:g}% y sería reescalado durante el render.'
                )
    return issues


def _has_renderable_word_timings(value):
    """Return true only when FFmpeg has at least one complete timed word to draw.

    Word-timed captions use the dedicated karaoke/pop rendering path, so their
    clip-level style/animation are intentionally not interpreted. A malformed or
    empty list must not be allowed to masquerade as word-timed, otherwise the MP4
    renderer falls back to the static caption path with potentially different
    semantics from the editor.
    """
    if not isinstance(value, list) or not value:
        return False
    for word in value:
        if not isinstance(word, dict) or not str(word.get('word', '')).strip():
            continue
        if _finite(word.get('start')) and _finite(word.get('end')) and float(word.get('end')) > float(word.get('start')):
            return True
    return False


def inspect(project):
    issues = []
    fps_value = project.get('fps', 30)
    try:
        if isinstance(fps_value, bool) or fps_value is None or (isinstance(fps_value, str) and not fps_value.strip()):
            raise ValueError
        fps_number = float(fps_value)
        if not math.isfinite(fps_number):
            raise ValueError
        fps = int(round(fps_number))
    except (TypeError, ValueError, OverflowError):
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
            issues.extend(_validate_visual_state(clip, clip_id, name))

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

        if track == 3 and not _has_renderable_word_timings(clip.get('wordTimings')):
            style = str(clip.get('style', 'dynamic') or 'dynamic')
            raw_animation = clip.get('animation', 'none')
            animation = str(raw_animation or 'none')
            if style not in ALLOWED_CAPTION_STYLES:
                issues.append(f'Caption "{name}" ({clip_id}): estilo "{style}" no reproducible en MP4.')
            if animation not in ALLOWED_CAPTION_ANIMATIONS:
                issues.append(f'Caption "{name}" ({clip_id}): animación "{animation}" no reproducible en MP4.')
            elif animation == 'word-by-word':
                issues.append(
                    f'Caption "{name}" ({clip_id}): animación "word-by-word" requiere wordTimings válidos para conservar paridad en MP4.'
                )
            elif style == 'dynamic' and animation == 'pop':
                issues.append(f'Caption "{name}" ({clip_id}): animación "pop" solo es reproducible con estilo "hook-pop".')
            elif style == 'hook-pop' and animation == 'word-pulse':
                issues.append(f'Caption "{name}" ({clip_id}): animación "word-pulse" solo es reproducible con estilo "dynamic".')

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
