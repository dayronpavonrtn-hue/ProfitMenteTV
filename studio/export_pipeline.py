import copy
import json
import os
import tempfile
from pathlib import Path

from studio_bridge import convert
from studio.render_qa import inspect_plan

VISUAL_TRACKS = {0, 1, 2, 3}
AUDIO_TRACKS = {4, 5, 6}


def _track_index(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not number.is_integer():
        return None
    index = int(number)
    return index if 0 <= index <= 6 else None


def _merged_track_state(project):
    result = {i: {'hidden': False, 'muted': False, 'solo': False} for i in range(7)}
    for field in ('trackStates', 'trackState'):
        states = project.get(field)
        if not isinstance(states, dict):
            continue
        for raw_track, raw_state in states.items():
            track = _track_index(raw_track)
            if track is None or not isinstance(raw_state, dict):
                continue
            for flag in ('hidden', 'muted', 'solo'):
                result[track][flag] = result[track][flag] or raw_state.get(flag) is True
    return result


def apply_export_track_state(project):
    """Return a copy containing only clips that are audible/visible at export time."""
    if not isinstance(project, dict):
        raise TypeError('Proyecto inválido')
    clean = copy.deepcopy(project)
    clips = clean.get('clips')
    if not isinstance(clips, list):
        clean['clips'] = []
        return clean
    states = _merged_track_state(clean)
    visual_solo = {i for i in VISUAL_TRACKS if states[i]['solo']}
    audio_solo = {i for i in AUDIO_TRACKS if states[i]['solo']}

    def active(clip):
        if not isinstance(clip, dict):
            return False
        track = _track_index(clip.get('track'))
        if track is None:
            return True  # let the bridge own malformed-track handling
        state = states[track]
        if track in VISUAL_TRACKS:
            return not state['hidden'] and (not visual_solo or track in visual_solo)
        return not state['muted'] and (not audio_solo or track in audio_solo)

    clean['clips'] = [clip for clip in clips if active(clip)]
    return clean


def _asset_kind(asset):
    """Return image/video/audio when metadata is conclusive; otherwise None."""
    if not isinstance(asset, dict):
        return None
    raw_type = str(asset.get('type') or '').strip().lower()
    mime = str(asset.get('mime') or '').strip().lower()
    if raw_type in {'image', 'video', 'audio'}:
        return raw_type
    for kind in ('image', 'video', 'audio'):
        if mime.startswith(kind + '/'):
            return kind
    return None


def validate_media_track_compatibility(project):
    """Fail before generator/render when a known media type is placed on an impossible track.

    Unknown metadata stays permissive for backwards compatibility. Caption clips are text
    and may legitimately have no asset. Video/overlay/motion accept image or video; the
    audio tracks accept audio only.
    """
    if not isinstance(project, dict):
        raise TypeError('Proyecto inválido')
    assets = project.get('assets') if isinstance(project.get('assets'), list) else []
    lookup = {}
    for asset in assets:
        if not isinstance(asset, dict):
            continue
        asset_id = asset.get('id')
        if asset_id is not None and not isinstance(asset_id, bool):
            lookup[str(asset_id).strip()] = asset

    problems = []
    clips = project.get('clips') if isinstance(project.get('clips'), list) else []
    for clip in clips:
        if not isinstance(clip, dict):
            continue
        track = _track_index(clip.get('track'))
        asset_id = clip.get('asset')
        if track is None or asset_id is None or isinstance(asset_id, bool):
            continue
        asset = lookup.get(str(asset_id).strip())
        kind = _asset_kind(asset)
        if kind is None:
            continue
        clip_id = clip.get('id', clip.get('name', 'clip'))
        if track in {0, 1, 2} and kind == 'audio':
            problems.append(f'Clip {clip_id!r}: medio de audio no puede usarse en pista visual {track}.')
        elif track in AUDIO_TRACKS and kind != 'audio':
            problems.append(f'Clip {clip_id!r}: medio {kind} no puede usarse en pista de audio {track}.')
    if problems:
        raise ValueError('Medios incompatibles con el timeline: ' + ' | '.join(problems))
    return True


def build_export(project, final=True):
    export_project = apply_export_track_state(project)
    validate_media_track_compatibility(export_project)
    plan = convert(export_project)
    qa = inspect_plan(plan, final=final)
    return {'ok': qa['ok'], 'project': export_project, 'plan': plan, 'qa': qa}


def _sync_parent_directory(directory):
    """Make a successful rename durable on filesystems that support directory fsync.

    Windows does not expose POSIX directory fsync through Python, so the already-flushed
    file + os.replace path remains the safe fallback there.
    """
    if os.name == 'nt' or not hasattr(os, 'O_DIRECTORY'):
        return
    flags = os.O_RDONLY | os.O_DIRECTORY
    fd = os.open(str(directory), flags)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _atomic_write_json(destination, payload):
    """Publish a complete, crash-durable export without exposing partial JSON."""
    out = Path(destination)
    out.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    fd, temp_name = tempfile.mkstemp(prefix=f'.{out.name}.', suffix='.tmp', dir=str(out.parent))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, out)
        _sync_parent_directory(out.parent)
    except BaseException:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def export_file(source, destination, final=True):
    """Build and atomically publish an export only after its requested QA gate passes.

    A failed final-render gate must never overwrite a previously valid export. Generator
    exports use the same rule for hard blockers while retaining generator-stage warnings.
    """
    project = json.loads(Path(source).read_text(encoding='utf-8'))
    result = build_export(project, final=final)
    if not result['ok']:
        blockers = result.get('qa', {}).get('blockers') or ['QA bloqueó la exportación.']
        raise ValueError('Exportación bloqueada por QA: ' + ' | '.join(str(item) for item in blockers))
    _atomic_write_json(destination, result)
    return result
