#!/usr/bin/env python3
from clip_identity_preflight import canonical_clip_id, inspect_clip_identities

assert canonical_clip_id(7) == '7'
assert canonical_clip_id('7') == '7'
assert canonical_clip_id('007') == '7'
assert canonical_clip_id('+7.0') == '7'
assert canonical_clip_id('-0') == '0'
assert canonical_clip_id(False) is None
assert canonical_clip_id([]) is None
assert canonical_clip_id({}) is None
assert canonical_clip_id(7.5) is None
assert canonical_clip_id('clip-A') == 'clip-A'

valid = inspect_clip_identities({'clips': [
    {'id': 7}, {'id': 'clip-A'}, {'id': '8.5'}, {'id': 'scene-2'}
]})
assert valid['ok'] is True, valid

for aliases in [
    [7, '7'],
    ['007', '+7.0'],
    [0, '-0'],
    ['7e0', 7],
]:
    report = inspect_clip_identities({'clips': [{'id': aliases[0]}, {'id': aliases[1]}]})
    assert report['ok'] is False, (aliases, report)
    assert 'ambigua' in report['errors'][0]

for invalid in [None, True, False, [], {}, 1.5, float('inf')]:
    report = inspect_clip_identities({'clips': [{'id': invalid}]})
    assert report['ok'] is False, (invalid, report)
    assert 'id inválido' in report['errors'][0]

report = inspect_clip_identities({'clips': 'corrupt'})
assert report['ok'] is False and 'lista' in report['errors'][0]

print('Clip identity render preflight QA OK')
