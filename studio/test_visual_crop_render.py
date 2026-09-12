#!/usr/bin/env python3
"""Regression checks for strict visual crop parsing used by MP4 rendering."""

from visual_crop_render import normalize_visual_crop, visual_crop_filter


def expect(actual, expected, label):
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def main():
    expect(
        normalize_visual_crop({'visualCrop': {'left': '12.5', 'right': 7, 'top': '1e1', 'bottom': 0}}),
        {'left': 12.5, 'right': 7.0, 'top': 10.0, 'bottom': 0.0},
        'legacy numeric scalars remain supported',
    )

    invalid = [True, False, [], [12], {}, {'value': 12}, '', '   ', 'nan', 'inf', '-inf', None]
    for value in invalid:
        crop = normalize_visual_crop({'visualCrop': {'left': value, 'right': value, 'top': value, 'bottom': value}})
        expect(crop, {'left': 0.0, 'right': 0.0, 'top': 0.0, 'bottom': 0.0}, f'invalid crop {value!r}')

    clamped = normalize_visual_crop({'visualCrop': {'left': '90', 'right': '90', 'top': 120, 'bottom': -4}})
    if abs(clamped['left'] - 47.5) > 1e-9 or abs(clamped['right'] - 47.5) > 1e-9:
        raise AssertionError(f'horizontal crop normalization failed: {clamped!r}')
    expect(clamped['top'], 95.0, 'top clamp')
    expect(clamped['bottom'], 0.0, 'bottom clamp')

    expect(visual_crop_filter({'visualCrop': {'left': True}}), '', 'boolean must not generate FFmpeg crop')
    filter_value = visual_crop_filter({'visualCrop': {'left': '10'}})
    if 'crop=' not in filter_value or 'pad=' not in filter_value:
        raise AssertionError(f'valid crop must generate crop+pad filter: {filter_value!r}')

    print('Visual crop render strict numeric QA OK')


if __name__ == '__main__':
    main()
