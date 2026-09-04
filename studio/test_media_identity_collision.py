#!/usr/bin/env python3
"""Regression checks for canonical media identity used by local render."""
from media_identity import asset_map, media_id_key, normalize_project_media_ids


assert media_id_key(0) == '0'
assert media_id_key(' 7 ') == '7'
assert media_id_key('   ') is None

project = {
    'assets': [
        {'id': 0, 'name': 'zero.mp4', 'type': 'video'},
        {'id': ' 7 ', 'name': 'seven.wav', 'type': 'audio'},
    ],
    'clips': [
        {'id': 'v0', 'track': 0, 'asset': '0'},
        {'id': 'a7', 'track': 6, 'asset': 7},
    ],
}
out = normalize_project_media_ids(project)
assert [asset['id'] for asset in out['assets']] == ['0', '7'], out
assert [clip['asset'] for clip in out['clips']] == ['0', '7'], out
assert set(asset_map(out)) == {'0', '7'}

ambiguous = {
    'assets': [
        {'id': 7, 'name': 'first.mp4', 'type': 'video'},
        {'id': ' 7 ', 'name': 'second.mp4', 'type': 'video'},
    ],
    'clips': [{'id': 'c', 'track': 0, 'asset': 7}],
}
try:
    normalize_project_media_ids(ambiguous)
except ValueError as exc:
    message = str(exc)
    assert 'ambiguos' in message and "'7'" in message, message
else:
    raise AssertionError('Canonical media collision must be rejected')

try:
    asset_map({'assets': [{'id': 0}, {'id': '0'}]})
except ValueError as exc:
    assert "'0'" in str(exc), exc
else:
    raise AssertionError('asset_map must reject equivalent duplicate IDs')

print('Canonical media identity collision QA OK')
