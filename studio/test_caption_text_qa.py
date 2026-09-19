import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.render_qa import inspect_project
from studio_bridge import convert


def project(caption):
    return {
        'duration': 2,
        'assets': [{'id': 'v', 'type': 'video', 'duration': 2}],
        'clips': [
            {'id': 'video', 'track': 0, 'asset': 'v', 'start': 0, 'duration': 2},
            caption,
        ],
    }


def run():
    missing = {'id': 'missing', 'name': 'Clip', 'track': 3, 'start': 0, 'duration': 2}
    plan = convert(project(missing))
    assert plan['tracks']['captions'][0]['text'] == '', 'caption name must never become rendered subtitle text'

    generator = inspect_project(project(missing))
    assert generator['ok'] is True
    assert generator['metrics']['empty_caption_clips'] == 1
    assert any('sin texto visible' in warning for warning in generator['warnings'])

    final = inspect_project(project(missing), final=True)
    assert final['ok'] is False
    assert any('sin texto visible' in blocker for blocker in final['blockers'])

    explicit = {'id': 'caption', 'name': 'internal label', 'track': 3, 'start': 0, 'duration': 2, 'text': 'Texto real'}
    ready = inspect_project(project(explicit), final=True)
    assert ready['ok'] is True
    assert ready['metrics']['empty_caption_clips'] == 0


if __name__ == '__main__':
    run()
    print('caption text QA: OK')
