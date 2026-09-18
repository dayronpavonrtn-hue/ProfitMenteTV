import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio_bridge import convert, normalize_clip_automation


def expect_invalid(value, duration=4):
    try:
        normalize_clip_automation(value, duration)
    except ValueError:
        return
    raise AssertionError(f'automation should be rejected: {value!r}')


def run():
    project = {
        'duration': 8,
        'clips': [{
            'id': 'auto-video', 'track': 0, 'start': 1, 'duration': 4,
            'automation': {
                'enabled': True,
                'preset': '  energetic-cut  ',
                'rule': 'beat-sync',
                'intensity': 0.75,
                'start': 0.5,
                'end': 3.5,
            },
        }],
    }
    plan = convert(project)
    automation = plan['tracks']['video'][0]['automation']
    assert automation == {
        'enabled': True,
        'preset': 'energetic-cut',
        'rule': 'beat-sync',
        'intensity': 0.75,
        'start': 0.5,
        'end': 3.5,
    }
    assert plan['features']['clip_automation'] is True

    defaults = normalize_clip_automation({'enabled': False}, 2.5)
    assert defaults == {'enabled': False, 'start': 0.0, 'end': 2.5}

    expect_invalid('auto')
    expect_invalid({'enabled': 1})
    expect_invalid({'preset': '   '})
    expect_invalid({'intensity': -0.01})
    expect_invalid({'intensity': 1.01})
    expect_invalid({'start': -1})
    expect_invalid({'start': 2, 'end': 2})
    expect_invalid({'start': 0, 'end': 5}, 4)

    # Project-end clipping must also constrain the automation window.
    clipped = {'duration': 3, 'clips': [{'id': 'clip', 'track': 0, 'start': 2, 'duration': 4,
        'automation': {'start': 0, 'end': 2}}]}
    try:
        convert(clipped)
    except ValueError as exc:
        assert 'Ventana de automatización' in str(exc)
    else:
        raise AssertionError('automation beyond clipped timeline window must be rejected')

    print('Studio bridge automation QA OK')


if __name__ == '__main__':
    run()
