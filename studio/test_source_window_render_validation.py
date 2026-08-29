#!/usr/bin/env python3
import json, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
VALIDATOR = ROOT / 'validate_project.py'


def run(project):
    with tempfile.TemporaryDirectory() as td:
        p = pathlib.Path(td) / 'project.json'
        p.write_text(json.dumps(project), encoding='utf-8')
        return subprocess.run([sys.executable, str(VALIDATOR), str(p)], capture_output=True, text=True)


def base_project():
    return {
        'format': '9:16',
        'duration': 10,
        'assets': [{'id': 'v1', 'name': 'clip.mp4', 'type': 'video', 'duration': 6.0, 'hasAudio': True}],
        'clips': [{'id': 'c1', 'track': 0, 'asset': 'v1', 'name': 'Video', 'start': 0, 'duration': 3.0, 'sourceOffset': 1.0, 'speed': 1.0}],
    }


ok = run(base_project())
assert ok.returncode == 0, ok.stdout + ok.stderr

p = base_project(); p['clips'][0]['sourceOffset'] = 4.0
bad = run(p)
assert bad.returncode == 2
assert 'fuente insuficiente' in bad.stdout.lower()

p = base_project(); p['clips'][0]['sourceOffset'] = 1.0; p['clips'][0]['speed'] = 2.0
bad_speed = run(p)
assert bad_speed.returncode == 2
assert '7.00s' in bad_speed.stdout

p = base_project(); p['clips'][0]['sourceOffset'] = -0.1
negative = run(p)
assert negative.returncode == 2
assert 'sourceoffset negativo' in negative.stdout.lower()

p = base_project(); p['trackState'] = {'0': {'hidden': True}}; p['clips'][0]['sourceOffset'] = 8.0
hidden = run(p)
assert hidden.returncode == 0, hidden.stdout + hidden.stderr

p = base_project(); p['assets'][0].pop('duration'); p['clips'][0]['sourceOffset'] = 100
unknown_duration = run(p)
assert unknown_duration.returncode == 0, unknown_duration.stdout + unknown_duration.stderr

print('Source window render validation QA passed')
