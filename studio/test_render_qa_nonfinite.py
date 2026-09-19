import math

from studio.render_qa import inspect_plan


def base_plan(duration=5):
    return {
        'duration': duration,
        'tracks': {
            'video': [{'id': 'v', 'start': 0, 'end': 5, 'asset_id': 'video'}],
            'overlay': [], 'motion': [], 'captions': [],
            'sfx': [], 'music': [], 'voice': [],
        },
    }


def test_nonfinite_project_duration_is_blocked():
    for value in (float('nan'), float('inf'), float('-inf'), 'nan', 'inf'):
        report = inspect_plan(base_plan(value), final=True)
        assert report['ok'] is False
        assert report['metrics']['duration'] == 0.0
        assert any('duración del proyecto' in item for item in report['blockers'])


def test_nonfinite_clip_bounds_do_not_poison_metrics():
    plan = base_plan()
    plan['tracks']['video'].extend([
        {'id': 'nan-start', 'start': math.nan, 'end': 2, 'asset_id': 'video'},
        {'id': 'inf-end', 'start': 1, 'end': math.inf, 'asset_id': 'video'},
    ])
    report = inspect_plan(plan, final=True)
    assert math.isfinite(report['metrics']['visual_coverage_seconds'])
    assert math.isfinite(report['metrics']['visual_coverage_ratio'])
    assert report['metrics']['visual_coverage_ratio'] == 1.0


def run():
    test_nonfinite_project_duration_is_blocked()
    test_nonfinite_clip_bounds_do_not_poison_metrics()
    print('Studio render QA non-finite guard OK')


if __name__ == '__main__':
    run()
