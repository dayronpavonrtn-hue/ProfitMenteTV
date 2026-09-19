import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.source_audio_preflight import validate_visual_source_audio


def project(clips, assets=None, states=None):
    return {
        'assets': assets or [
            {'id': 'video', 'type': 'video', 'name': 'clip.mp4', 'hasAudio': True},
            {'id': 'silent', 'type': 'video', 'name': 'silent.mp4', 'hasAudio': False},
            {'id': 'image', 'type': 'image', 'name': 'still.png'},
        ],
        'clips': clips,
        'trackState': states or {},
    }


def clip(cid, track, asset, **extra):
    item = {'id': cid, 'track': track, 'asset': asset, 'name': cid}
    item.update(extra)
    return item


def expect_error(p, text):
    errors = validate_visual_source_audio(p)
    assert errors, 'invalid source-audio state must be reported'
    assert any(text in error for error in errors), errors


def run():
    # Valid embedded source audio on the two visual source tracks.
    assert validate_visual_source_audio(project([
        clip('main', 0, 'video', sourceVolume=1.0),
        clip('overlay', 1, 'video', sourceVolume=0.5),
    ])) == []

    # Boundary values are valid and numeric strings are accepted consistently.
    assert validate_visual_source_audio(project([
        clip('mute-source', 0, 'video', sourceVolume=0),
        clip('max-source', 1, 'video', sourceVolume='2'),
    ])) == []

    for value in (-0.01, 2.01, float('nan'), float('inf'), 'boost'):
        expect_error(project([clip('bad-volume', 0, 'video', sourceVolume=value)]), 'sourceVolume')

    # Requesting embedded audio from media known to be silent must fail early.
    expect_error(project([clip('silent-source', 0, 'silent', sourceVolume=1)]), 'no tiene audio')

    # Still images do not have temporal source audio and must not be rejected.
    assert validate_visual_source_audio(project([
        clip('still', 0, 'image', sourceVolume=1),
    ])) == []

    # Disabled visual tracks are not rendered and must not block export QA.
    assert validate_visual_source_audio(project(
        [clip('disabled-bad', 1, 'silent', sourceVolume=99)],
        states={'1': {'hidden': True}},
    )) == []

    # Legacy trackStates must remain supported, including solo behavior.
    p = project([
        clip('solo-main', 0, 'video', sourceVolume=1),
        clip('ignored-overlay', 1, 'silent', sourceVolume=99),
    ])
    p['trackStates'] = {'0': {'solo': True}}
    assert validate_visual_source_audio(p) == []


if __name__ == '__main__':
    run()
    print('source audio preflight QA: OK')
