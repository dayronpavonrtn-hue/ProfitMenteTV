#!/usr/bin/env python3
import json, pathlib, subprocess, sys, tempfile

root = pathlib.Path(__file__).resolve().parent
preflight = root / 'render_state_preflight.py'

def run(project):
    with tempfile.TemporaryDirectory() as td:
        path = pathlib.Path(td) / 'project.json'
        path.write_text(json.dumps(project), encoding='utf-8')
        return subprocess.run([sys.executable, str(preflight), str(path)], capture_output=True, text=True)

def expect_ok(project):
    result = run(project)
    assert result.returncode == 0, result.stdout + result.stderr

def expect_fail(project, needle):
    result = run(project)
    assert result.returncode != 0, result.stdout
    assert needle in result.stdout, result.stdout

expect_ok({'clips': [], 'trackState': {'0': {'hidden': False}, '5': {'muted': True}}})
expect_ok({'clips': [{'track': 0, 'muted': False, 'flipX': True, 'flipY': False, 'disabled': False}]})
expect_fail({'clips': [], 'trackState': {'0': {'hidden': 'false'}}}, 'hidden debe ser booleano JSON')
expect_fail({'clips': [], 'trackStates': {'5': {'muted': 0}}}, 'muted debe ser booleano JSON')
expect_fail({'clips': [{'muted': 'true'}]}, 'muted debe ser booleano JSON')
expect_fail({'clips': [{'disabled': 1}]}, 'disabled debe ser booleano JSON')
expect_fail({'clips': [{'flipX': 'false'}]}, 'flipX debe ser booleano JSON')
expect_fail({'clips': [], 'trackState': []}, 'trackState debe ser un objeto')
print('render state preflight regression OK')
