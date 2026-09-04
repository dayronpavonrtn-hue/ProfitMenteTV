import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio_bridge import convert, normalize_fps, normalize_track


def test_track_aliases_and_asset_zero():
    project = {
        'duration': 12,
        'fps': 60,
        'clips': [
            {'id': 'v0', 'track': '00', 'name': 'Video', 'start': 0, 'duration': 2, 'asset': 0},
            {'id': 'ov1', 'track': '1.0', 'name': 'Overlay', 'start': 1, 'duration': 2, 'asset': '07'},
            {'id': 'sfx4', 'track': '04', 'name': 'SFX', 'start': 2, 'duration': 1, 'asset': 4},
            {'id': 'voice6', 'track': '6.0', 'name': 'Voice', 'start': 3, 'duration': 1, 'asset': 6},
        ],
    }
    plan = convert(project)
    assert plan['format']['fps'] == 60
    assert plan['tracks']['video'][0]['asset_id'] == 0
    assert plan['tracks']['overlay'][0]['id'] == 'ov1'
    assert plan['tracks']['sfx'][0]['id'] == 'sfx4'
    assert plan['tracks']['voice'][0]['id'] == 'voice6'


def test_invalid_tracks_are_skipped_without_crashing():
    invalid_tracks = [None, '', ' ', True, False, 6.5, '6.5', 7, '7', -1, 'two', float('nan'), float('inf')]
    project = {
        'duration': 10,
        'clips': [
            {'id': f'bad-{i}', 'track': value, 'start': 0, 'duration': 1}
            for i, value in enumerate(invalid_tracks)
        ],
    }
    plan = convert(project)
    assert all(not entries for entries in plan['tracks'].values())


def test_timeline_bounds_and_bad_numeric_values():
    project = {
        'duration': 5,
        'clips': [
            {'id': 'negative-start', 'track': 0, 'start': -3, 'duration': 2},
            {'id': 'cross-end', 'track': 1, 'start': 4, 'duration': 20},
            {'id': 'past-end', 'track': 0, 'start': 5, 'duration': 1},
            {'id': 'bad-start', 'track': 0, 'start': 'nope', 'duration': 1},
            {'id': 'bad-duration', 'track': 0, 'start': 2, 'duration': 'nope'},
            {'id': 'not-a-clip'},
            'invalid-record',
        ],
    }
    plan = convert(project)
    video = {item['id']: item for item in plan['tracks']['video']}
    overlay = {item['id']: item for item in plan['tracks']['overlay']}
    assert video['negative-start']['start'] == 0
    assert video['negative-start']['end'] == 2
    assert overlay['cross-end']['end'] == 5
    assert 'past-end' not in video
    assert video['bad-start']['start'] == 0
    assert video['bad-duration']['end'] == 3


def test_manual_video_and_caption_choices_survive_bridge():
    project = {
        'duration': 10,
        'clips': [
            {'id': 'video', 'track': 0, 'name': 'A', 'start': 0, 'duration': 2, 'transition': 'fade'},
            {
                'id': 'caption',
                'track': 3,
                'name': 'Fallback',
                'text': 'Texto manual',
                'start': 0,
                'duration': 2,
                'animation': 'none',
                'highlightKeywords': False,
            },
        ],
    }
    plan = convert(project)
    assert plan['tracks']['video'][0]['transition'] == 'fade'
    caption = plan['tracks']['captions'][0]
    assert caption['text'] == 'Texto manual'
    assert caption['animation'] == 'none'
    assert caption['highlight_keywords'] is False


def test_fps_and_project_defaults():
    assert normalize_track('05') == 5
    assert normalize_track('5.0') == 5
    assert normalize_track('5.2') is None
    assert normalize_fps(24) == 24
    assert normalize_fps('60') == 60
    assert normalize_fps(25) == 30
    assert normalize_fps(float('nan')) == 30

    plan = convert({'duration': 'bad', 'format': 'bad', 'fps': 999, 'clips': []})
    assert plan['duration'] == 45.0
    assert plan['format'] == {'width': 1080, 'height': 1920, 'fps': 30}


def run():
    test_track_aliases_and_asset_zero()
    test_invalid_tracks_are_skipped_without_crashing()
    test_timeline_bounds_and_bad_numeric_values()
    test_manual_video_and_caption_choices_survive_bridge()
    test_fps_and_project_defaults()
    print('Studio bridge QA OK')


if __name__ == '__main__':
    run()
