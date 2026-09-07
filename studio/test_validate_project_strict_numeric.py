#!/usr/bin/env python3
"""Regression tests for strict numeric validation at the local MP4 boundary."""
import copy
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
VALIDATOR = ROOT / 'validate_project.py'

BASE = {
    'format': '9:16',
    'duration': 10,
    'fps': 30,
    'assets': [],
    'clips': [
        {
            'id': 'motion-1',
            'track': 2,
            'start': 0,
            'duration': 2,
            'speed': 1,
            'name': 'ProfitMente',
            'textStyle': 'title',
            'textAnimation': 'pop',
            'textX': 0,
            'textY': -28,
            'fontSize': 40,
            'boxOpacity': 0.55,
            'textColor': '#FFE66D',
            'boxColor': '#000000',
        }
    ],
}


def run(project):
    with tempfile.TemporaryDirectory(prefix='profitmente-strict-validator-') as td:
        path = pathlib.Path(td) / 'project.json'
        path.write_text(json.dumps(project), encoding='utf-8')
        return subprocess.run(
            [sys.executable, str(VALIDATOR), str(path)],
            capture_output=True,
            text=True,
        )


def assert_rejected(label, mutate):
    project = copy.deepcopy(BASE)
    mutate(project)
    result = run(project)
    if result.returncode == 0:
        raise AssertionError(f'{label}: el validator aceptó un valor coercible inválido\n{result.stdout}')


def assert_accepted(label, mutate):
    project = copy.deepcopy(BASE)
    mutate(project)
    result = run(project)
    if result.returncode != 0:
        raise AssertionError(f'{label}: compatibilidad heredada válida rechazada\n{result.stdout}\n{result.stderr}')


# Python bool is an int subclass; every persisted edit parameter must still reject it.
assert_rejected('project duration bool', lambda p: p.__setitem__('duration', True))
assert_rejected('clip start bool', lambda p: p['clips'][0].__setitem__('start', False))
assert_rejected('clip duration bool', lambda p: p['clips'][0].__setitem__('duration', True))
assert_rejected('clip track bool', lambda p: p['clips'][0].__setitem__('track', True))
assert_rejected('clip speed bool', lambda p: p['clips'][0].__setitem__('speed', False))
assert_rejected('motion x bool', lambda p: p['clips'][0].__setitem__('textX', True))
assert_rejected('motion font bool', lambda p: p['clips'][0].__setitem__('fontSize', True))
assert_rejected('motion opacity bool', lambda p: p['clips'][0].__setitem__('boxOpacity', False))

# Containers must not be converted or accepted as numbers.
assert_rejected('project duration list', lambda p: p.__setitem__('duration', [10]))
assert_rejected('clip start object', lambda p: p['clips'][0].__setitem__('start', {'value': 0}))
assert_rejected('clip speed list', lambda p: p['clips'][0].__setitem__('speed', [1]))

# Numeric strings are a supported legacy representation and must stay compatible.
def legacy_strings(project):
    project['duration'] = '10'
    clip = project['clips'][0]
    clip.update({
        'track': '02',
        'start': '0.0',
        'duration': '2',
        'speed': '1.0',
        'textX': '0',
        'textY': '-28',
        'fontSize': '40',
        'boxOpacity': '0.55',
    })

assert_accepted('legacy numeric strings', legacy_strings)

# Visual edit parameters use the same strict contract even without an attached asset.
def visual_bool(project):
    clip = project['clips'][0]
    clip.update({'track': 0, 'name': 'Visual', 'positionX': True})

assert_rejected('visual transform bool', visual_bool)

print('Strict local project numeric validation regression OK')
