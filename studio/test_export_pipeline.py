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
            # Timed media fixtures must carry the same duration metadata required
            # from real Studio imports. Keeping the fixture export-valid ensures
            # failures below exercise the condition under test instead of being
            # masked by the fail-closed media-metadata preflight.
            {'id': 'a', 'type': 'audio', 'name': 'voice.wav', 'duration': 10},
            {'id': 'm', 'type': 'audio', 'name': 'music.wav', 'duration': 10},
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


def expect_bad_playback(p, expected_text):
    try:
        build_export(p, final=True)
    except ValueError as exc:
        message = str(exc)
        assert 'Controles de reproducción inválidos' in message
        assert expected_text in message
    else:
        raise AssertionError('invalid playback controls must block final export')


def expect_bad_track(value):
    bad = clip('bad-track', value, 'v')
    try:
        build_export(project([bad]), final=True)
    except ValueError as exc:
        message = str(exc)
        assert 'Pistas de timeline inválidas' in message
        assert 'bad-track' in message
    else:
        raise AssertionError(f'invalid timeline track {value!r} must block final export')


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

    muted_voice = clip('muted-voice', 6, 'a')
    muted_voice['muted'] = True
    p = project([clip('video', 0, 'v'), muted_voice, clip('music', 5, 'm')])
    filtered = apply_export_track_state(p)
    assert [c['id'] for c in filtered['clips']] == ['video', 'music']
    assert p['clips'][1]['muted'] is True, 'export filtering must not mutate clip mute state'
    ready = build_export(p, final=True)
    assert ready['ok'] is True
    assert ready['plan']['tracks']['voice'] == []
    assert [item['id'] for item in ready['plan']['tracks']['music']] == ['music']

    ready = build_export(project([clip('video', 0, 'v')]), final=True)
    assert ready['ok'] is True
    assert ready['plan']['tracks']['video'][0]['id'] == 'video'

    # Invalid/ambiguous track identities must never disappear silently in the bridge.
    for value in (None, True, False, '', ' ', -1, 7, 1.5, 'voice', float('nan'), float('inf')):
        expect_bad_track(value)
    string_track = build_export(project([clip('video', 0, 'v'), clip('string-track', '6', 'a')]), final=True)
    assert string_track['ok'] is True
    assert [item['id'] for item in string_track['plan']['tracks']['voice']] == ['string-track']

    expect_broken_reference(project([clip('missing', 0, 'does-not-exist')]), 'does-not-exist')
    expect_broken_reference(project([clip('empty', 0, '   ')]), 'vacía o inválida')

    disabled = project(
        [clip('video', 0, 'v'), clip('disabled-missing', 1, 'does-not-exist')],
        {'1': {'hidden': True}},
    )
    ready = build_export(disabled, final=True)
    assert ready['ok'] is True
    assert [c['id'] for c in ready['project']['clips']] == ['video']

    bad = clip('bad-offset', 0, 'v')
    bad['sourceOffset'] = -0.01
    expect_bad_playback(project([bad]), 'sourceOffset')

    for value in (0, 0.24, 4.01, float('nan'), 'fast'):
        bad = clip('bad-speed', 0, 'v')
        bad['speed'] = value
        expect_bad_playback(project([bad]), 'speed')

    for value in (-0.01, 2.01, float('inf'), 'loud'):
        bad = clip('bad-volume', 6, 'a')
        bad['volume'] = value
        expect_bad_playback(project([bad]), 'volume')

    for value in (-0.01, 2.01, float('nan'), 'boost'):
        bad = clip('bad-source-volume', 6, 'a')
        bad['sourceVolume'] = value
        expect_bad_playback(project([bad]), 'sourceVolume')

    good = clip('controlled-audio', 6, 'a')
    good.update({'sourceOffset': 0, 'speed': 0.25, 'volume': 0, 'sourceVolume': 0})
    assert build_export(project([clip('video', 0, 'v'), good]), final=True)['ok'] is True
    good.update({'speed': 1, 'volume': 2, 'sourceVolume': 2})
    assert build_export(project([clip('video', 0, 'v'), good]), final=True)['ok'] is True

    bounded = project([])
    bounded['duration'] = 4
    bounded['assets'].append({'id': 'bounded', 'type': 'video', 'name': 'bounded.mp4', 'duration': 12})
    valid = clip('bounded-ok', 0, 'bounded')
    valid.update({'duration': 4, 'sourceOffset': 4, 'speed': 2})
    ready = build_export({**bounded, 'clips': [valid]}, final=True)
    assert ready['ok'] is True
    assert ready['plan']['tracks']['video'][0]['source_end'] == 12

    invalid = clip('bounded-overrun', 0, 'bounded')
    invalid.update({'duration': 4, 'sourceOffset': 4.01, 'speed': 2})
    try:
        build_export({**bounded, 'clips': [invalid]}, final=True)
    except ValueError as exc:
        assert 'excede la duración del medio fuente' in str(exc)
    else:
        raise AssertionError('source overrun must block final export')

    ignored = clip('ignored', 5, 'm')
    ignored['volume'] = 99
    ignored['sourceVolume'] = 99
    ready = build_export(project([clip('video', 0, 'v'), ignored], {'5': {'muted': True}}), final=True)
    assert ready['ok'] is True


if __name__ == '__main__':
    run()
    print('export pipeline QA: OK')
