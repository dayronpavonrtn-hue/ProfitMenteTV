#!/usr/bin/env python3
"""Reject ambiguous persisted composition settings before local MP4 render."""
import json
import math
import pathlib
import sys

VALID_FORMATS = {'9:16', '16:9', '1:1'}
VALID_FPS = {24, 30, 60}
VALID_QUALITY = {'draft', 'standard', 'high'}
MIN_TRACK = 0
MAX_TRACK = 6
MIN_SPEED = 0.25
MAX_SPEED = 4.0
MIN_VOLUME = 0.0
MAX_VOLUME = 2.0
TRACK_FLAGS = ('hidden', 'muted', 'solo', 'locked')


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


def _clip_id(value):
    """Return the canonical persisted clip id, or None when it is unusable."""
    if isinstance(value, bool) or value is None or not isinstance(value, (str, int, float)):
        return None
    if isinstance(value, float) and not math.isfinite(value):
        return None
    clip_id = str(value).strip()
    return clip_id or None


def _track_number(value):
    track = _number(value)
    if track is None or not track.is_integer() or not MIN_TRACK <= int(track) <= MAX_TRACK:
        return None
    return int(track)


def _inspect_track_states(project, issues):
    """Validate persisted mixer/visibility state shared by preview and render."""
    for field in ('trackState', 'trackStates'):
        if field not in project:
            continue
        states = project.get(field)
        if not isinstance(states, dict):
            issues.append(f'{field} debe ser un objeto de estados por pista.')
            continue
        seen_tracks = set()
        for raw_track, state in states.items():
            track = _track_number(raw_track)
            if track is None:
                issues.append(f'{field} contiene pista inválida {raw_track!r}; usa claves entre {MIN_TRACK} y {MAX_TRACK}.')
                continue
            if track in seen_tracks:
                issues.append(f'{field} contiene aliases duplicados para la pista {track}; conserva una sola clave canónica.')
            else:
                seen_tracks.add(track)
            if not isinstance(state, dict):
                issues.append(f'{field}[{raw_track!r}] debe ser un objeto de estado válido.')
                continue
            if 'gain' in state:
                gain = _number(state.get('gain'))
                if gain is None or not MIN_VOLUME <= gain <= MAX_VOLUME:
                    issues.append(
                        f'{field}[{raw_track!r}] tiene gain inválido {state.get("gain")!r}; '
                        f'usa un valor entre {MIN_VOLUME:g} y {MAX_VOLUME:g}.'
                    )
            for flag in TRACK_FLAGS:
                if flag in state and not isinstance(state.get(flag), bool):
                    issues.append(f'{field}[{raw_track!r}] tiene {flag} inválido {state.get(flag)!r}; usa true o false.')


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

    duration = _number(project.get('duration', 45))
    if duration is None or duration <= 0:
        issues.append(f'Duración de proyecto inválida {project.get("duration")!r}; usa un valor mayor que 0 segundos.')

    quality = project.get('renderQuality', 'high')
    if not isinstance(quality, str) or quality not in VALID_QUALITY:
        issues.append(f'Calidad de render inválida {quality!r}; usa draft, standard o high.')

    _inspect_track_states(project, issues)

    clips = project.get('clips', [])
    if not isinstance(clips, list):
        issues.append('La colección clips debe ser una lista válida.')
    else:
        seen_clip_ids = set()
        for index, clip in enumerate(clips):
            if not isinstance(clip, dict):
                issues.append(f'Clip #{index + 1} debe ser un objeto válido.')
                continue

            if 'id' in clip:
                clip_id = _clip_id(clip.get('id'))
                if clip_id is None:
                    issues.append(f'Clip #{index + 1} tiene ID inválido {clip.get("id")!r}; elimina el campo o usa una identidad no vacía.')
                elif clip_id in seen_clip_ids:
                    issues.append(f'Clip #{index + 1} tiene ID duplicado {clip_id!r}; cada clip debe tener una identidad única.')
                else:
                    seen_clip_ids.add(clip_id)

            has_start = 'start' in clip
            has_duration = 'duration' in clip
            if has_start != has_duration:
                missing = 'duration' if has_start else 'start'
                issues.append(f'Clip #{index + 1} tiene timing incompleto; falta {missing} para definir su ventana en la timeline.')

            start = None
            clip_duration = None
            if has_start:
                start = _number(clip.get('start'))
                if start is None or start < 0:
                    issues.append(f'Clip #{index + 1} tiene inicio inválido {clip.get("start")!r}; usa 0 o más segundos.')
            if has_duration:
                clip_duration = _number(clip.get('duration'))
                if clip_duration is None or clip_duration <= 0:
                    issues.append(f'Clip #{index + 1} tiene duración inválida {clip.get("duration")!r}; usa un valor mayor que 0 segundos.')

            if 'track' in clip:
                track = _track_number(clip.get('track'))
                if track is None:
                    issues.append(f'Clip #{index + 1} tiene pista inválida {clip.get("track")!r}; usa un entero entre {MIN_TRACK} y {MAX_TRACK}.')
            if 'sourceOffset' in clip:
                source_offset = _number(clip.get('sourceOffset'))
                if source_offset is None or source_offset < 0:
                    issues.append(f'Clip #{index + 1} tiene sourceOffset inválido {clip.get("sourceOffset")!r}; usa 0 o más segundos.')
            if 'speed' in clip:
                speed = _number(clip.get('speed'))
                if speed is None or not MIN_SPEED <= speed <= MAX_SPEED:
                    issues.append(f'Clip #{index + 1} tiene velocidad inválida {clip.get("speed")!r}; usa un valor entre {MIN_SPEED:g}x y {MAX_SPEED:g}x.')

            for field in ('volume', 'sourceVolume'):
                if field in clip:
                    level = _number(clip.get(field))
                    if level is None or not MIN_VOLUME <= level <= MAX_VOLUME:
                        issues.append(
                            f'Clip #{index + 1} tiene {field} inválido {clip.get(field)!r}; '
                            f'usa un valor entre {MIN_VOLUME:g} y {MAX_VOLUME:g}.'
                        )

            fade_values = {}
            for field in ('fadeIn', 'fadeOut'):
                if field in clip:
                    fade = _number(clip.get(field))
                    fade_values[field] = fade
                    if fade is None or fade < 0:
                        issues.append(f'Clip #{index + 1} tiene {field} inválido {clip.get(field)!r}; usa 0 o más segundos.')
                    elif clip_duration is not None and clip_duration > 0 and fade > clip_duration:
                        issues.append(f'Clip #{index + 1} tiene {field} de {fade:g}s mayor que su duración ({clip_duration:g}s).')
            if (
                clip_duration is not None and clip_duration > 0
                and fade_values.get('fadeIn') is not None and fade_values.get('fadeIn') >= 0
                and fade_values.get('fadeOut') is not None and fade_values.get('fadeOut') >= 0
                and fade_values['fadeIn'] + fade_values['fadeOut'] > clip_duration + 1e-9
            ):
                issues.append(
                    f'Clip #{index + 1} tiene fades combinados de '
                    f'{fade_values["fadeIn"] + fade_values["fadeOut"]:g}s, mayores que su duración ({clip_duration:g}s).'
                )

            if (
                duration is not None and duration > 0
                and start is not None and start >= 0
                and clip_duration is not None and clip_duration > 0
                and start + clip_duration > duration + 1e-9
            ):
                issues.append(f'Clip #{index + 1} termina en {start + clip_duration:g}s, fuera de la duración del proyecto ({duration:g}s).')
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
