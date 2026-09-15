#!/usr/bin/env python3
import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('project_structure_preflight', ROOT / 'project_structure_preflight.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
inspect = module.inspect


def expect_ok(project):
    issues = inspect(project)
    assert not issues, issues


def expect_bad(project, needle):
    issues = inspect(project)
    assert issues, project
    assert any(needle in issue for issue in issues), issues


expect_ok({
    'clips': [{'id': 'clip-1', 'track': 0, 'asset': 'media-1'}],
    'assets': [{'id': 'media-1', 'name': 'video.mp4', 'type': 'video'}],
})
expect_bad([], 'objeto JSON')
expect_bad({'clips': {}, 'assets': []}, 'clips debe ser una lista')
expect_bad({'clips': [], 'assets': {}}, 'assets debe ser una lista')
expect_bad({'clips': ['bad'], 'assets': []}, 'Clip 0: estructura inválida')
expect_bad({'clips': [], 'assets': ['bad']}, 'Asset 0: estructura inválida')
expect_bad({'clips': [], 'assets': [{'id': '', 'name': 'x.mp4'}]}, 'id inválido')
expect_bad({'clips': [], 'assets': [{'id': 'a', 'name': 'x.mp4'}, {'id': 'a', 'name': 'y.mp4'}]}, 'id duplicado')
expect_bad({'clips': [], 'assets': [{'id': 1, 'name': 'x.mp4'}, {'id': '1', 'name': 'y.mp4'}]}, 'id duplicado')
expect_bad({'clips': [], 'assets': [{'id': 'a', 'name': ''}]}, 'nombre de archivo inválido')
expect_bad({'clips': [{'id': 'c'}, {'id': 'c'}], 'assets': []}, 'id duplicado')

# Asset names are basenames inside assets/. Reject traversal and nested paths before
# any renderer joins them to the temporary extraction directory.
expect_bad({'clips': [], 'assets': [{'id': 'a', 'name': '../project.json'}]}, 'ruta no permitida')
expect_bad({'clips': [], 'assets': [{'id': 'a', 'name': 'nested/video.mp4'}]}, 'ruta no permitida')
expect_bad({'clips': [], 'assets': [{'id': 'a', 'name': r'nested\\video.mp4'}]}, 'ruta no permitida')
expect_bad({'clips': [], 'assets': [{'id': 'a', 'name': '..'}]}, 'ruta no permitida')

# Studio targets Windows too: names differing only by case resolve to the same file
# there and must not be allowed to select media ambiguously.
expect_bad({
    'clips': [],
    'assets': [
        {'id': 'a', 'name': 'Intro.MP4'},
        {'id': 'b', 'name': 'intro.mp4'},
    ],
}, 'nombre de archivo duplicado')

print('Project structure preflight regression OK')
