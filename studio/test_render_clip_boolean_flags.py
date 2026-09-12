#!/usr/bin/env python3
from track_state_render import normalize_track_solo


def normalized(**values):
    clip={'id':'clip-1','track':0}
    clip.update(values)
    project={'clips':[clip],'assets':[]}
    return normalize_track_solo(project)['clips'][0]


def test_non_boolean_clip_flags_cannot_activate_render_switches():
    c=normalized(muted='false',flipX='true',flipY=1)
    assert c['muted'] is False
    assert c['flipX'] is False
    assert c['flipY'] is False


def test_only_explicit_true_activates_render_switches():
    c=normalized(muted=True,flipX=True,flipY=True)
    assert c['muted'] is True
    assert c['flipX'] is True
    assert c['flipY'] is True


def test_false_flags_remain_false_without_mutating_source():
    original={'id':'clip-1','track':4,'muted':False,'flipX':False,'flipY':False}
    project={'clips':[original],'assets':[]}
    result=normalize_track_solo(project)['clips'][0]
    assert original=={'id':'clip-1','track':4,'muted':False,'flipX':False,'flipY':False}
    assert result['muted'] is False
    assert result['flipX'] is False
    assert result['flipY'] is False


if __name__=='__main__':
    tests=[value for name,value in sorted(globals().items()) if name.startswith('test_') and callable(value)]
    for test in tests:
        test()
    print(f'OK: {len(tests)} strict render clip flag checks')
