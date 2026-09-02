#!/usr/bin/env python3
"""Regression guard for direct render_mp4 legacy/Solo track-state parity."""
from pathlib import Path

from track_state_render import normalize_track_solo


source = Path(__file__).with_name('render_mp4.py').read_text(encoding='utf-8')
import_line = 'from track_state_render import normalize_track_solo'
load_line = "project=normalize_track_solo(json.loads(p.read_text(encoding='utf-8')))"
state_line = "track_state=project.get('trackState') if isinstance(project.get('trackState'),dict) else {}"

assert import_line in source, 'render_mp4.py debe usar el normalizador canónico de pistas'
assert load_line in source, 'render_mp4.py debe normalizar el proyecto al cargarlo'
assert state_line in source, 'la lectura efectiva de trackState cambió inesperadamente'
assert source.index(load_line) < source.index(state_line), 'la normalización debe ocurrir antes de leer trackState'

legacy = {
    'trackState': {
        '0': {'hidden': False},
        '4': {'muted': False},
    },
    'trackStates': {
        '0': {'hidden': True},
        '4': {'muted': True},
    },
}
normalized = normalize_track_solo(legacy)
assert normalized['trackState']['0']['hidden'] is True
assert normalized['trackState']['4']['muted'] is True
assert 'trackStates' not in normalized

solo = {
    'trackStates': {
        '1': {'solo': True},
        '5': {'solo': True},
    }
}
normalized_solo = normalize_track_solo(solo)
assert normalized_solo['trackState']['0']['hidden'] is True
assert normalized_solo['trackState']['1']['hidden'] is False
assert normalized_solo['trackState']['4']['muted'] is True
assert normalized_solo['trackState']['5']['muted'] is False

print('MP4 legacy/Solo track-state parity OK')
