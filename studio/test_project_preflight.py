import json
import tempfile
from pathlib import Path

try:
    from studio import project_preflight as preflight
except ModuleNotFoundError:
    import project_preflight as preflight


def run():
    # Real export validation is surfaced as a stable machine-readable blocker.
    bad = preflight.inspect_project({
        'duration': 1,
        'assets': [],
        'clips': [{'id': 'bad-track', 'track': 9}],
    })
    assert bad['ok'] is False
    assert bad['stage'] == 'validation'
    assert 'Pistas de timeline inválidas' in bad['blockers'][0]

    # Automation callers receive a compact summary and preserve QA warnings.
    original = preflight.build_export
    try:
        preflight.build_export = lambda project, final=True: {
            'ok': True,
            'qa': {'ok': True, 'blockers': [], 'warnings': ['preview warning']},
        }
        ready = preflight.inspect_project({
            'duration': 8,
            'assets': [{'id': 'v'}],
            'clips': [{'id': 'c'}],
        })
        assert ready == {
            'ok': True,
            'stage': 'ready',
            'blockers': [],
            'warnings': ['preview warning'],
            'summary': {'assets': 1, 'clips': 1, 'duration': 8},
        }
    finally:
        preflight.build_export = original

    # Broken/non-object project files fail closed without tracebacks.
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'project.json'
        path.write_text('{broken', encoding='utf-8')
        report = preflight.inspect_file(path)
        assert report['ok'] is False and report['stage'] == 'load'
        path.write_text(json.dumps([1, 2, 3]), encoding='utf-8')
        report = preflight.inspect_file(path)
        assert report['ok'] is False and report['stage'] == 'load'


if __name__ == '__main__':
    run()
    print('project preflight QA: OK')
