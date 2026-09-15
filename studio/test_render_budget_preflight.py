#!/usr/bin/env python3
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
CHECK = ROOT / 'render_budget_preflight.py'


def run(project):
    with tempfile.TemporaryDirectory() as td:
        path = pathlib.Path(td) / 'project.json'
        path.write_text(json.dumps(project), encoding='utf-8')
        return subprocess.run([sys.executable, str(CHECK), str(path)], capture_output=True, text=True)


def expect_ok(project):
    result = run(project)
    assert result.returncode == 0, result.stderr or result.stdout


def expect_fail(project, needle):
    result = run(project)
    assert result.returncode != 0, result.stdout
    assert needle in (result.stderr + result.stdout), result.stderr + result.stdout


expect_ok({'duration': 45, 'clips': []})
expect_ok({'duration': 6 * 60 * 60, 'clips': [{'id': 'a'}]})
expect_fail({'duration': 6 * 60 * 60 + 0.01, 'clips': []}, 'supera el límite local seguro')
expect_fail({'duration': True, 'clips': []}, 'duración de proyecto inválida')
expect_fail({'duration': 'NaN', 'clips': []}, 'duración de proyecto inválida')
expect_fail({'duration': 45, 'clips': {}}, 'clips debe ser una lista')
expect_fail({'duration': 45, 'clips': [{}] * 10001}, 'clips activos superan el límite local seguro')
expect_ok({'duration': 45, 'clips': [{'disabled': True}] * 10001})
print('render budget preflight regression OK')
