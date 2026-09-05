#!/usr/bin/env python3
"""Regression checks for canonical media identity used by local render."""
from media_identity import asset_map, media_id_key, normalize_project_media_ids


# Match the browser editor/preview identity rules for legacy numeric IDs.
assert media_id_key(0) == '0'
assert media_id_key(-0.0) == '0'
assert media_id_key('-0') == '0'
assert media_id_key(' 7 ') == '7'
assert media_id_key('007') == '7'
assert media_id_key('7.0') == '7'
assert media_id_key('+07.000') == '7'
assert media_id_key('.50') == '0.5'
assert media_id_key('0.500') == '0.5'
# JavaScript Number.toString uses fixed notation at 1e-6 and unpadded
# scientific exponents below that threshold. The Python render path must match.
assert media_id_key('0.000001') == '0.000001'
assert media_id_key('0.00000120') == '0.0000012'
assert media_id_key('0.0000001') == '1e-7'
assert media_id_key('0.000000123') == '1.23e-7'
assert media_id_key('100000000000000000000') == '100000000000000000000'
assert media_id_key(' Asset A ') == 'Asset A'
assert media_id_key('Asset A') != media_id_key('asset a')
assert media_id_key('   ') is None

project = {
    'assets': [
        {'id': '-0', 'name': 'zero.mp4', 'type': 'video'},
        {'id': '007', 'name': 'seven.wav', 'type': 'audio'},
        {'id': '0.0000001', 'name': 'tiny.png', 'type': 'image'},
        {'id': ' Asset A ', 'name': 'named.png', 'type': 'image'},
    ],
    'clips': [
        {'id': 'v0', 'track': 0, 'asset': 0},
        {'id': 'a7', 'track': 6, 'asset': '+07.000'},
        {'id': 'tiny', 'track': 1, 'asset': '0.000000100'},
        {'id': 'named', 'track': 1, 'asset': 'Asset A'},
    ],
}
out = normalize_project_media_ids(project)
assert [asset['id'] for asset in out['assets']] == ['0', '7', '1e-7', 'Asset A'], out
assert [clip['asset'] for clip in out['clips']] == ['0', '7', '1e-7', 'Asset A'], out
assert set(asset_map(out)) == {'0', '7', '1e-7', 'Asset A'}

# Different legacy spellings of the same numeric media identity must be rejected
# before strict renderer lookups can silently choose the wrong local file.
ambiguous = {
    'assets': [
        {'id': 7, 'name': 'first.mp4', 'type': 'video'},
        {'id': '+007.000', 'name': 'second.mp4', 'type': 'video'},
    ],
    'clips': [{'id': 'c', 'track': 0, 'asset': '7.0'}],
}
try:
    normalize_project_media_ids(ambiguous)
except ValueError as exc:
    message = str(exc)
    assert 'ambiguos' in message and "'7'" in message, message
else:
    raise AssertionError('Canonical numeric media collision must be rejected')

try:
    asset_map({'assets': [{'id': '-0'}, {'id': 0.0}]})
except ValueError as exc:
    assert "'0'" in str(exc), exc
else:
    raise AssertionError('asset_map must reject equivalent negative-zero IDs')

# Scientific/fixed legacy spellings that JavaScript treats as one numeric identity
# must also collide before render, rather than pointing clips at different files.
try:
    asset_map({'assets': [{'id': '0.0000001'}, {'id': '0.000000100'}]})
except ValueError as exc:
    assert "'1e-7'" in str(exc), exc
else:
    raise AssertionError('asset_map must reject equivalent tiny numeric IDs')

# Text identities remain case-sensitive and are not accidentally folded together.
text_map = asset_map({'assets': [{'id': 'Media-A'}, {'id': 'media-a'}]})
assert set(text_map) == {'Media-A', 'media-a'}

print('Canonical media identity collision QA OK')
