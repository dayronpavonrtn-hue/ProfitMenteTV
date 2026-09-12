#!/usr/bin/env python3
from caption_render_timing import normalize_project_caption_timings
from track_state_render import normalize_track_solo


def normalized_caption(**values):
    clip={'id':'caption-1','track':3,'name':'UNO DOS','start':10,'duration':2}
    clip.update(values)
    project={'duration':20,'clips':[clip],'assets':[]}
    staged=normalize_track_solo(project)
    return normalize_project_caption_timings(staged)['clips'][0]


def test_studio_native_absolute_word_timings_survive_render_scalar_normalization():
    clip=normalized_caption(wordTimings=[
        {'word':'UNO','start':'10.0','end':'11.0'},
        {'word':'DOS','start':'11.0','end':'12.0'},
    ])
    assert clip['wordTimingMode']=='absolute'
    assert clip['wordTimings']==[
        {'word':'UNO','start':10.0,'end':11.0,'duration':1.0},
        {'word':'DOS','start':11.0,'end':12.0,'duration':1.0},
    ]


def test_clip_relative_word_timings_remain_supported():
    clip=normalized_caption(wordTimingMode='relative',wordTimings=[
        {'word':'UNO','start':'0.0','end':'1.0'},
        {'word':'DOS','start':'1.0','end':'2.0'},
    ])
    assert clip['wordTimingMode']=='absolute'
    assert clip['wordTimings']==[
        {'word':'UNO','start':10.0,'end':11.0,'duration':1.0},
        {'word':'DOS','start':11.0,'end':12.0,'duration':1.0},
    ]


def test_timing_outside_both_relative_and_absolute_clip_windows_fails_closed():
    staged=normalize_track_solo({'duration':20,'clips':[
        {'id':'caption-1','track':3,'name':'MAL','start':10,'duration':2,
         'wordTimings':[{'word':'MAL','start':'5','end':'6'}]},
    ],'assets':[]})
    assert staged['clips'][0]['wordTimings']==[]


if __name__=='__main__':
    tests=[value for name,value in sorted(globals().items()) if name.startswith('test_') and callable(value)]
    for test in tests:
        test()
    print(f'OK: {len(tests)} caption absolute/relative render timing checks')
