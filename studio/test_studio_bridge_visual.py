import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio_bridge import convert


def test_visual_edits_survive_bridge():
    project = {
        'duration': 10,
        'clips': [{
            'id': 'animated', 'track': 0, 'start': 1, 'duration': 4,
            'visualAdjustments': {'brightness': '150', 'contrast': 80, 'saturation': 120, 'grayscale': '25'},
            'visualKeyframes': [
                {'time': 4, 'x': 200, 'y': -200, 'scale': 8, 'rotation': 3600, 'opacity': 1, 'easing': 'ease-in'},
                {'time': 1, 'x': 10, 'y': 20, 'scale': 1.2, 'rotation': 5, 'opacity': .8, 'easing': 'HOLD'},
            ],
        }],
    }
    item = convert(project)['tracks']['video'][0]
    assert item['visual_adjustments'] == {'brightness': 150.0, 'contrast': 80.0, 'saturation': 120.0, 'grayscale': 25.0}
    assert [frame['time'] for frame in item['visual_keyframes']] == [1.0, 4.0]
    assert item['visual_keyframes'][0]['easing'] == 'hold'
    assert item['visual_keyframes'][1]['scale'] == 8.0


def test_visual_edits_are_rejected_when_unsafe():
    invalid = [
        {'visualAdjustments': {'brightness': 301}},
        {'visualAdjustments': 'bright'},
        {'visualKeyframes': [{'time': 2.1}]},
        {'visualKeyframes': [{'time': 1, 'x': 201}]},
        {'visualKeyframes': [{'time': 1, 'easing': 'mystery'}]},
        {'visualKeyframes': [{'time': 1}, {'time': 1.0005}]},
    ]
    for extra in invalid:
        clip = {'id': 'bad', 'track': 0, 'start': 0, 'duration': 2, **extra}
        try:
            convert({'duration': 5, 'clips': [clip]})
        except ValueError:
            pass
        else:
            raise AssertionError(f'unsafe visual edit must be rejected: {extra!r}')


def test_audio_does_not_receive_visual_payload():
    plan = convert({'duration': 5, 'clips': [{
        'id': 'audio', 'track': 6, 'start': 0, 'duration': 2,
        'visualAdjustments': {'brightness': 301},
    }]})
    assert 'visual_adjustments' not in plan['tracks']['voice'][0]


if __name__ == '__main__':
    test_visual_edits_survive_bridge()
    test_visual_edits_are_rejected_when_unsafe()
    test_audio_does_not_receive_visual_payload()
    print('Studio bridge visual QA OK')
