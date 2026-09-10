#!/usr/bin/env python3
from visual_keyframe_render import expand_visual_keyframes, normalize_visual_keyframes, state_at


def close(a, b, eps=1e-6):
    assert abs(a - b) <= eps, (a, b)


clip = {
    'id': 'v1', 'track': 0, 'asset': 'asset-1', 'start': 5, 'duration': 6,
    'sourceOffset': 2, 'speed': 2,
    'transition': 'fade', 'transitionDuration': .4,
    'visualKeyframes': [
        {'time': 1, 'x': -10, 'y': 0, 'scale': 1, 'rotation': 0, 'opacity': 1},
        {'time': 3, 'x': 20, 'y': 10, 'scale': 1.5, 'rotation': 30, 'opacity': .5},
        {'time': 5, 'x': 40, 'y': -20, 'scale': 2, 'rotation': 60, 'opacity': .8},
    ],
}
project = {'clips': [clip, {'id': 'audio', 'track': 5, 'duration': 6}]}
frames = normalize_visual_keyframes(clip)
assert len(frames) == 3
# Browser semantics: hold the first state before first keyframe, interpolate,
# then hold the final state after the last keyframe.
assert state_at(frames, 6, 0)['x'] == -10
close(state_at(frames, 6, 2)['x'], 5)
assert state_at(frames, 6, 6)['x'] == 40

expanded = expand_visual_keyframes(project)
visual = [item for item in expanded['clips'] if item.get('track') == 0]
assert len(visual) == 4, visual
assert [round(item['duration'], 6) for item in visual] == [1, 2, 2, 1]
assert [round(item['start'], 6) for item in visual] == [5, 6, 8, 10]
# speed=2 means each one-second timeline advance moves two seconds in source.
assert [round(item['sourceOffset'], 6) for item in visual] == [2, 4, 8, 12]
assert visual[0]['transition'] == 'fade'
assert all(item.get('transition') == 'cut' for item in visual[1:])
assert all('visualKeyframes' not in item for item in visual)
assert visual[0]['keyframes']['start']['positionX'] == -10
assert visual[0]['keyframes']['end']['positionX'] == -10
close(visual[1]['keyframes']['start']['positionX'], -10)
close(visual[1]['keyframes']['end']['positionX'], 20)
close(visual[2]['keyframes']['end']['scale'], 2)
assert visual[3]['keyframes']['end']['positionY'] == -20
# Audio/nonvisual clips are not segmented by the render-only visual adapter.
assert len([item for item in expanded['clips'] if item.get('track') == 5]) == 1
# Original project must remain untouched.
assert project['clips'][0]['visualKeyframes'][1]['x'] == 20
assert 'keyframes' not in project['clips'][0]

# Match JS normalization: booleans/invalid times are ignored; duplicate-near
# times keep the stable timestamp and latest state; visual values are clamped.
corrupt = {
    'track': 1, 'duration': 2,
    'visualKeyframes': [
        {'time': True, 'x': 100},
        {'time': '1.0000', 'scale': 99},
        {'time': 1.0005, 'scale': .01, 'opacity': -2},
        {'time': 'bad', 'x': 2},
    ],
}
safe = normalize_visual_keyframes(corrupt)
assert len(safe) == 1
assert safe[0]['time'] == 1.0
assert safe[0]['scale'] == .1
assert safe[0]['opacity'] == 0
print('Visual keyframe MP4 bridge QA OK')
