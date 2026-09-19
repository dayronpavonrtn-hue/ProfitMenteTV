import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.export_pipeline import apply_export_track_state, build_export


def project(clips, states=None):
    return {
        'duration': 10,
        'format': '9:16',
        'assets': [
            {'id': 'v', 'type': 'image', 'name': 'video.png'},
            {'id': 'o', 'type': 'image', 'name': 'overlay.png'},
            {'id': 'a', 'type': 'audio', 'name': 'voice.wav'},
            {'id': 'm', 'type': 'audio', 'name': 'music.wav'},
        ],
        'clips': clips,
        'trackState': states or {},
    }


def clip(cid, track, asset):
    return {'id': cid, 'track': track, 'asset': asset, 'name': cid, 'start': 0, 'duration': 10}


def expect_broken_reference(p, expected_text):
    try:
        build_export(p, final=True)
    except ValueError as exc:
        message = str(exc)
        assert 'Referencias de medios rotas' in message
        assert expected_text in message
    else:
        raise AssertionError('broken media reference must block final export')


def run():
    p = project(
        [clip('video', 0, 'v'), clip('overlay', 1, 'o'), clip('voice', 6, 'a'), clip('music', 5, 'm')],
        {'1': {'hidden': True}, '5': {'muted': True}},
    )
    filtered = apply_export_track_state(p)
    assert [c['id'] for c in filtered['clips']] == ['video', 'voice']
    assert len(p['clips']) == 4, 'export filtering must not mutate the editor project'

    p = project(
        [clip('video', 0, 'v'), clip('overlay', 1, 'o'), clip('voice', 6, 'a'), clip('music', 5, 'm')],
        {'1': {'solo': True}, '5': {'solo': True}},
    )
    filtered = apply_export_track_state(p)
    assert [c['id'] for c in filtered['clips']] == ['overlay', 'music']

    p['trackStates'] = {'1': {'hidden': True}}
    filtered = apply_export_track_state(p)
    assert [c['id'] for c in filtered['clips']] == ['music'], 'legacy and current state must merge safely'

    ready = build_export(project([clip('video', 0, 'v')]), final=True)
    assert ready['ok'] is True
    assert ready['plan']['tracks']['video'][0]['id'] == 'video'

    expect_broken_reference(project([clip('missing', 0, 'does-not-exist')]), 'does-not-exist')
    expect_broken_reference(project([clip('empty', 0, '   ')]), 'vacía o inválida')

    # A broken reference on a disabled track must not block export because that clip is not rendered.
    disabled = project(
        [clip('video', 0, 'v'), clip('disabled-missing', 1, 'does-not-exist')],
        {'1': {'hidden': True}},
    )
    ready = build_export(disabled, final=True)
    assert ready['ok'] is True
    assert [c['id'] for c in ready['project']['clips']] == ['video']


if __name__ == '__main__':
    run()
    print('export pipeline QA: OK')
