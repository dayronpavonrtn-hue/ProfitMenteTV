#!/usr/bin/env python3
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(root))
from visual_adjust_render import normalize_visual_adjustments, visual_adjust_filter
from visual_crop_render import normalize_visual_crop, visual_crop_filter

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

crop = normalize_visual_crop({'visualCrop': {'left': 20, 'right': 0, 'top': 10, 'bottom': 0}})
assert crop == {'left': 20.0, 'right': 0.0, 'top': 10.0, 'bottom': 0.0}, crop
crop_filter = visual_crop_filter({'visualCrop': crop})
assert crop_filter.startswith('crop=iw*0.80000000:ih*0.90000000:iw*0.20000000:ih*0.10000000'), crop_filter
assert 'pad=iw/0.80000000:ih/0.90000000:iw*0.25000000:ih*0.11111111:color=black@0' in crop_filter, crop_filter

# Crop must be included even when all color adjustments are neutral.
f = visual_adjust_filter({'visualCrop': {'left': 20, 'top': 10}})
assert f == crop_filter, (f, crop_filter)

# Crop is applied before visual adjustments so transparent geometry survives
# and color operations affect only retained pixels.
f = visual_adjust_filter({
    'visualCrop': {'left': 20},
    'visualAdjustments': {'brightness': 50, 'grayscale': 100},
})
assert f.startswith('crop='), f
assert ',pad=' in f, f
assert f.index('pad=') < f.index('colorchannelmixer='), f
assert f.index('colorchannelmixer=') < f.index('eq='), f

# Opposing extreme crop values are normalized to retain at least 5%.
crop = normalize_visual_crop({'visualCrop': {'left': 95, 'right': 95, 'top': 95, 'bottom': 95}})
assert abs(crop['left'] + crop['right'] - 95.0) < 1e-9, crop
assert abs(crop['top'] + crop['bottom'] - 95.0) < 1e-9, crop

print('Visual adjustment + crop MP4 filter parity OK')
