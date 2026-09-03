#!/usr/bin/env python3
"""Regression coverage for standalone validation of imported/legacy track state."""
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
VALIDATOR = ROOT / 'validate_project.py'


def validate(data):
    with tempfile.TemporaryDirectory() as td:
        project = pathlib.Path(td) / 'project.json'
        project.write_text(json.dumps(data), encoding='utf-8')
        proc = subprocess.run(
            [sys.executable, str(VALIDATOR), str(project)],
            check=False,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            raise AssertionError(proc.stdout or proc.stderr)
        return json.loads(proc.stdout)


# Integral numeric strings are valid legacy track numbers. Standalone validation
# must see the same tracks as preview/render and must not claim that video/audio is absent.
legacy = {
    'version': '1.0',
    'name': 'legacy-string-tracks',
    'format': '9:16',
    'duration': 1,
    'trackState': {},
    'assets': [
        {'id': 'v', 'name': 'source.mp4', 'type': 'video', 'hasAudio': True},
        {'id': 'a', 'name': 'voice.wav', 'type': 'audio'},
    ],
    'clips': [
        {'id': 'v1', 'track': '0.0', 'asset': 'v', 'start': 0, 'duration': 1},
        {'id': 'a1', 'track': '06', 'asset': 'a', 'start': 0, 'duration': 1},
    ],
}
result = validate(legacy)
assert result['ok'] is True, result
assert 'No hay medios visuales; el render usará fondo negro' not in result['warnings'], result
assert 'No hay audio en el proyecto' not in result['warnings'], result

# Legacy trackStates aliases must also disable media before asset validation. This
# keeps old hidden/muted offline clips from becoming false hard errors in the CLI QA path.
disabled = {
    'version': '1.0',
    'name': 'legacy-disabled-tracks',
    'format': '9:16',
    'duration': 1,
    'trackStates': {
        '0.0': {'hidden': True},
        '06': {'muted': True},
    },
    'assets': [],
    'clips': [
        {'id': 'v1', 'track': '0', 'asset': 'missing-video', 'start': 0, 'duration': 1},
        {'id': 'a1', 'track': '6.0', 'asset': 'missing-audio', 'start': 0, 'duration': 1},
    ],
}
result = validate(disabled)
assert result['ok'] is True, result
assert not result['errors'], result

print('Standalone legacy track validation OK')
