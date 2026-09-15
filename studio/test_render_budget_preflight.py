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
# Hidden visual tracks and muted audio tracks/clips produce no render workload.
expect_ok({'duration': 45, 'trackState': {'0': {'hidden': True}}, 'clips': [{'track': 0}] * 10001})
expect_ok({'duration': 45, 'trackState': {'4': {'muted': True}}, 'clips': [{'track': 4}] * 10001})
expect_ok({'duration': 45, 'clips': [{'track': 4, 'muted': True}] * 10001})
# A visual clip remains active when muted: muted only suppresses its source audio.
expect_fail({'duration': 45, 'clips': [{'track': 0, 'muted': True}] * 10001}, 'clips activos superan el límite local seguro')
# Imported string booleans are not trusted as state flags.
expect_fail({'duration': 45, 'trackState': {'0': {'hidden': 'true'}}, 'clips': [{'track': 0}] * 10001}, 'clips activos superan el límite local seguro')
# Invalid tracks count conservatively here and are diagnosed by the timeline preflight later.
expect_fail({'duration': 45, 'clips': [{'track': 'oops'}] * 10001}, 'clips activos superan el límite local seguro')
print('render budget preflight regression OK')
