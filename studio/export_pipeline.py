import copy
import json
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


def build_export(project, final=True):
    export_project = apply_export_track_state(project)
    plan = convert(export_project)
    qa = inspect_plan(plan, final=final)
    return {'ok': qa['ok'], 'project': export_project, 'plan': plan, 'qa': qa}


def export_file(source, destination, final=True):
    project = json.loads(Path(source).read_text(encoding='utf-8'))
    result = build_export(project, final=final)
    out = Path(destination)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result
