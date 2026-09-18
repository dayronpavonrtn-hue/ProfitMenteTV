#!/usr/bin/env python3
import copy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.export_pipeline import validate_referenced_media_metadata

BASE = {
    'assets': [
        {'id': 'v1', 'type': 'video', 'duration': 10, 'width': 1920, 'height': 1080},
        {'id': 'a1', 'mime': 'audio/wav', 'duration': 10},
    ],
    'clips': [
        {'id': 'c1', 'track': 0, 'asset': 'v1'},
        {'id': 'c2', 'track': 6, 'asset': 'a1'},
    ],
}


def rejected(mutator, expected):
    project = copy.deepcopy(BASE)
    mutator(project)
    try:
        validate_referenced_media_metadata(project)
    except ValueError as exc:
        assert expected in str(exc), str(exc)
    else:
        raise AssertionError(f'Expected rejection containing {expected!r}')


assert validate_referenced_media_metadata(copy.deepcopy(BASE)) is True
rejected(lambda p: p['assets'][0].update(duration=0), 'duración inválida')
rejected(lambda p: p['assets'][0].update(duration=float('nan')), 'duración inválida')
rejected(lambda p: p['assets'][0].update(width=-1), 'ancho inválido')
rejected(lambda p: p['assets'][0].update(height='bad'), 'alto inválido')
rejected(lambda p: p['assets'][1].update(duration=-5), 'duración inválida')
rejected(lambda p: p['assets'][0].update(mediaReadable=False), 'no pudo decodificarlo')

# Stale metadata on an unreferenced library item must not block an otherwise valid timeline.
unreferenced = copy.deepcopy(BASE)
unreferenced['assets'].append({'id': 'old', 'type': 'video', 'duration': 0, 'width': 0, 'height': 0})
assert validate_referenced_media_metadata(unreferenced) is True

# Missing metadata remains backwards-compatible; the bridge/renderer may still resolve it.
legacy = copy.deepcopy(BASE)
legacy['assets'][0] = {'id': 'v1', 'type': 'video'}
assert validate_referenced_media_metadata(legacy) is True

print('export media metadata regression: ok')
