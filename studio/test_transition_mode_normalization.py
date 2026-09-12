#!/usr/bin/env python3
from track_state_render import normalize_track_solo


def normalized(value, duration='0.4'):
    project={
        'clips':[{
            'id':'clip-1',
            'track':0,
            'start':0,
            'duration':3,
            'transition':value,
            'transitionDuration':duration,
        }],
        'assets':[],
    }
    return project, normalize_track_solo(project)['clips'][0]


def test_supported_transition_modes_are_preserved():
    for mode in ('cut','none','fade','slide','zoom'):
        _, clip=normalized(mode)
        assert clip['transition']==mode
        assert clip['transitionDuration']==0.4


def test_automatic_editor_modes_keep_render_semantics():
    for mode in ('cut','zoom'):
        _, clip=normalized(mode)
        assert clip['transition']==mode


def test_unknown_string_fails_closed_to_none():
    _, clip=normalized('wipe')
    assert clip['transition']=='none'


def test_non_string_transition_values_fail_closed_to_none():
    invalid=(True, False, 1, 0, ['fade'], {'mode':'fade'}, None)
    for value in invalid:
        _, clip=normalized(value)
        assert clip['transition']=='none', repr(value)


def test_empty_and_case_mismatched_values_do_not_create_accidental_fades():
    for value in ('', ' ', 'Fade', 'SLIDE', 'ZOOM', 'CUT'):
        _, clip=normalized(value)
        assert clip['transition']=='none', repr(value)


def test_source_project_is_not_mutated():
    project, clip=normalized({'bad':'fade'})
    assert project['clips'][0]['transition']=={'bad':'fade'}
    assert project['clips'][0]['transitionDuration']=='0.4'
    assert clip['transition']=='none'
    assert clip['transitionDuration']==0.4


def test_missing_transition_remains_missing():
    project={'clips':[{'id':'clip-1','track':0,'start':0,'duration':3}],'assets':[]}
    clip=normalize_track_solo(project)['clips'][0]
    assert 'transition' not in clip


if __name__=='__main__':
    tests=[value for name,value in sorted(globals().items()) if name.startswith('test_') and callable(value)]
    for test in tests:
        test()
    print(f'OK: {len(tests)} transition mode normalization checks')