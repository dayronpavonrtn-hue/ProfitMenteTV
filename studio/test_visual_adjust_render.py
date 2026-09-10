#!/usr/bin/env python3
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(root))
from visual_adjust_render import normalize_visual_adjustments, visual_adjust_filter

state = normalize_visual_adjustments({})
assert state == {
    'brightness': 100.0,
    'contrast': 100.0,
    'saturation': 100.0,
    'grayscale': 0.0,
}, state
assert visual_adjust_filter({}) == ''

state = normalize_visual_adjustments({
    'visualAdjustments': {
        'brightness': 900,
        'contrast': -5,
        'saturation': '250',
        'grayscale': 140,
    }
})
assert state == {
    'brightness': 300.0,
    'contrast': 0.0,
    'saturation': 250.0,
    'grayscale': 100.0,
}, state

f = visual_adjust_filter({'visualAdjustments': {'brightness': 50}})
assert 'colorchannelmixer=rr=0.500000' in f, f

f = visual_adjust_filter({'visualAdjustments': {'grayscale': 100}})
assert 'saturation=0.000000' in f, f

f = visual_adjust_filter({'visualAdjustments': {'saturation': 200, 'grayscale': 50}})
assert 'saturation=1.000000' in f, f

f = visual_adjust_filter({'visualAdjustments': {'brightness': 'bad', 'contrast': None}})
assert f == '', f

print('Visual adjustment MP4 filter parity OK')
